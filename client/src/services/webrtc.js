/**
 * Creates and configures an RTCPeerConnection for OpenAI Realtime API
 * @param {Object} config
 * @param {MediaStream} config.localStream - User's microphone stream
 * @param {Function} config.onTrack - Callback when remote track is received
 * @param {Function} config.onDataChannelMessage - Callback for data channel messages
 * @param {Function} config.onDataChannelClose - Callback when data channel closes
 * @param {Function} config.onIceStateChange - Callback for ICE connection state changes
 * @param {string} config.clientSecret - OpenAI API key
 * @param {string} config.model - Model identifier
 * @param {string} config.baseUrl - API endpoint URL
 * @returns {Promise<{pc: RTCPeerConnection, dataChannel: RTCDataChannel}>}
 */
export async function createRealtimeConnection({
  localStream,
  onTrack,
  onDataChannelMessage,
  onDataChannelClose,
  onIceStateChange,
  clientSecret,
  model = 'gpt-4o-realtime-preview-2024-12-17',
  baseUrl = 'https://api.openai.com/v1/realtime/calls'
}) {
  // Create peer connection
  const pc = new RTCPeerConnection();

  // Add audio transceiver
  pc.addTransceiver('audio', { direction: 'sendrecv' });

  // Add local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Handle remote track
  pc.ontrack = event => {
    const [remoteStream] = event.streams;
    if (remoteStream && onTrack) {
      onTrack(remoteStream, event.track);
    }
  };

  // Handle ICE connection state changes
  pc.oniceconnectionstatechange = () => {
    if (onIceStateChange) {
      onIceStateChange(pc.iceConnectionState);
    }
  };

  // Create data channel
  const dataChannel = pc.createDataChannel('oai-events');
  
  if (onDataChannelMessage) {
    dataChannel.onmessage = onDataChannelMessage;
  }
  
  if (onDataChannelClose) {
    dataChannel.onclose = onDataChannelClose;
  }

  // Create offer and gather ICE candidates
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);

  // Exchange SDP with OpenAI
  const localSdp = pc.localDescription?.sdp || offer.sdp;

  if (import.meta.env.DEV) {
    console.debug('Local SDP preview', localSdp);
  }

  const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      'Content-Type': 'application/sdp'
    },
    body: localSdp
  });

  if (!sdpResponse.ok) {
    const failureBody = await sdpResponse.text();
    console.error('Realtime SDP exchange failed', failureBody);
    let errorMessage = 'Failed to establish realtime session';
    try {
      const parsed = JSON.parse(failureBody);
      errorMessage = parsed?.error?.message || errorMessage;
    } catch (parseError) {
      errorMessage = failureBody || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const answer = await sdpResponse.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  return { pc, dataChannel };
}

/**
 * Waits for ICE gathering to complete
 * @param {RTCPeerConnection} pc
 * @returns {Promise<void>}
 */
function waitForIceGatheringComplete(pc) {
  return new Promise(resolve => {
    if (!pc) {
      resolve();
      return;
    }

    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', checkState);
  });
}
