import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  interviewPersonaAtom,
  evaluationFocusAtom
} from '../atoms/prepState.js';
import { createRealtimeConnection } from '../services/webrtc.js';
import { buildInterviewerSystemPrompt } from '../utils/interviewHelpers.js';

export function useRealtimeInterview() {
  const interviewPersona = useAtomValue(interviewPersonaAtom);
  const evaluationFocus = useAtomValue(evaluationFocusAtom);

  const [status, setStatus] = useState('idle'); // idle | connecting | in-progress | complete
  const [error, setError] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const localStreamRef = useRef(null);
  const statusRef = useRef(status);
  const instructionsRef = useRef('');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanupConnection = useCallback(() => {
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (_err) {
        // ignore
      }
      dataChannelRef.current = null;
    }

    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (_err) {
        // ignore
      }
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setIsMicActive(false);
    setRemoteStream(null);
  }, []);

  const startInterview = useCallback(async (session, questionStack, onDataChannelMessage, onInterviewReady) => {
    if (!session) {
      setError('Session is missing');
      return;
    }

    if (status === 'connecting' || status === 'in-progress') {
      return;
    }

    setError('');

    try {
      setStatus('connecting');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser');
      }

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      setIsMicActive(true);

      const { pc, dataChannel } = await createRealtimeConnection({
        localStream,
        onTrack: (stream, track) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
          }
          setRemoteStream(stream);

          if (track) {
            track.onended = () => {
              setRemoteStream(null);
            };
          }
        },
        onDataChannelMessage,
        onDataChannelClose: () => {
          if (statusRef.current === 'in-progress') {
            setError('The conversation partner disconnected.');
            setStatus('idle');
          }
        },
        onIceStateChange: (iceState) => {
          if (iceState === 'disconnected' || iceState === 'failed') {
            cleanupConnection();
            if (statusRef.current === 'in-progress') {
              setError('Realtime connection interrupted.');
              setStatus('idle');
            }
          }
        },
        clientSecret: session.clientSecret,
        model: session.model,
        baseUrl: session.baseUrl
      });

      peerRef.current = pc;
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        setStatus('in-progress');
        
        // For language practice, instructions are already set in the session
        // For interviews, we build them from question stack
        if (questionStack && questionStack.length > 0) {
          instructionsRef.current = session.instructions || buildInterviewerSystemPrompt(
            questionStack,
            evaluationFocus,
            interviewPersona || null
          );

          if (instructionsRef.current) {
            dataChannel.send(
              JSON.stringify({
                type: 'session.update',
                session: { instructions: instructionsRef.current }
              })
            );
          }

          dataChannel.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Begin the interview now.'
                  }
                ]
              }
            })
          );

          dataChannel.send(JSON.stringify({ type: 'response.create' }));
        } else {
          // For language practice, just trigger the conversation to start
          dataChannel.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Hello!'
                  }
                ]
              }
            })
          );

          dataChannel.send(JSON.stringify({ type: 'response.create' }));
        }

        if (onInterviewReady) {
          onInterviewReady();
        }
      };
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to start realtime session.');
      cleanupConnection();
      setStatus('idle');
      setIsMicActive(false);
    }
  }, [status, cleanupConnection, evaluationFocus, interviewPersona]);

  return {
    status,
    error,
    isMicActive,
    remoteAudioRef,
    remoteStream,
    dataChannelRef,
    startInterview,
    cleanupConnection
  };
}
