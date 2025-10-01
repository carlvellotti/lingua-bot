import { useCallback, useEffect, useRef } from 'react';

export default function AudioVisualizer({ remoteStream, status }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamSourceRef = useRef(null);
  const vizFrameRef = useRef(0);
  const vizDataArrayRef = useRef(null);
  const freqArrayRef = useRef(null);
  const binIndexRef = useRef(null);

  const stopVisualizer = useCallback(() => {
    if (vizFrameRef.current) {
      cancelAnimationFrame(vizFrameRef.current);
      vizFrameRef.current = 0;
    }
    try {
      if (analyserRef.current) analyserRef.current.disconnect();
    } catch (e) {
      // ignore
    }
    try {
      if (streamSourceRef.current) streamSourceRef.current.disconnect();
    } catch (e) {
      // ignore
    }
    analyserRef.current = null;
    streamSourceRef.current = null;
    vizDataArrayRef.current = null;
  }, []);

  const startLiveVisualizer = useCallback(async (stream) => {
    const canvas = canvasRef.current;
    if (!stream || !canvas) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    // Create or reuse shared AudioContext
    const audioCtx = audioContextRef.current || new AC();
    audioContextRef.current = audioCtx;
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch (e) { /* ignore */ }
    }

    // Create or reuse media stream source
    if (!streamSourceRef.current) {
      try {
        streamSourceRef.current = audioCtx.createMediaStreamSource(stream);
      } catch (e) {
        // ignore if already created
      }
    }

    // Create or reuse analyser
    const analyser = analyserRef.current || audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current = analyser;

    // Connect stream -> analyser (no destination to avoid double audio with <audio>)
    try {
      streamSourceRef.current.connect(analyser);
    } catch (e) {
      // ignore duplicate connections
    }

    const ctx = canvas.getContext('2d');

    // Allocate time-domain buffer once
    const timeBufferLength = analyser.fftSize;
    if (!vizDataArrayRef.current || vizDataArrayRef.current.length !== timeBufferLength) {
      vizDataArrayRef.current = new Uint8Array(timeBufferLength);
    }

    // Allocate frequency buffer once
    const freqBufferLength = analyser.frequencyBinCount;
    if (!freqArrayRef.current || freqArrayRef.current.length !== freqBufferLength) {
      freqArrayRef.current = new Uint8Array(freqBufferLength);
    }

    // Build log-spaced bin indices once for a ring of bars
    if (!binIndexRef.current) {
      const numBars = 48; // visual density
      const startIndex = 2; // skip DC/very low bins
      // Cap at reasonable frequency range for human audio (roughly 8kHz instead of full spectrum)
      const endIndex = Math.min(freqBufferLength - 1, Math.floor(freqBufferLength * 0.3));
      const availableRange = endIndex - startIndex;
      
      // Ensure we have enough unique bins for all bars
      const actualNumBars = Math.min(numBars, availableRange);
      
      const indices = [];
      const usedIndices = new Set();
      
      for (let i = 0; i < actualNumBars; i++) {
        const t = i / (actualNumBars - 1);
        const ratio = Math.pow(endIndex / startIndex, t);
        let idx = Math.min(endIndex, Math.max(startIndex, Math.floor(startIndex * ratio)));
        
        // Ensure uniqueness - if this index is already used, find the next available one
        while (usedIndices.has(idx) && idx <= endIndex) {
          idx++;
        }
        
        if (idx <= endIndex) {
          indices.push(idx);
          usedIndices.add(idx);
        }
      }
      
      // If we have fewer unique indices than requested bars, pad with remaining available indices
      if (indices.length < numBars) {
        for (let idx = startIndex; idx <= endIndex && indices.length < numBars; idx++) {
          if (!usedIndices.has(idx)) {
            indices.push(idx);
            usedIndices.add(idx);
          }
        }
      }
      
      binIndexRef.current = indices;
      
      // Debug: Log the frequency bin assignments
      if (import.meta.env.DEV) {
        console.log('Frequency bin assignments:', indices);
        console.log('Total bars:', indices.length, 'Unique bins:', new Set(indices).size);
      }
    }

    const draw = () => {
      // Width/height may change if container resizes; read per-frame
      const width = canvas.width;
      const height = canvas.height;
      const timeArray = vizDataArrayRef.current;
      const freqArray = freqArrayRef.current;
      if (!timeArray || !freqArray) return;

      // Pull data
      analyser.getByteTimeDomainData(timeArray);
      analyser.getByteFrequencyData(freqArray);

      // Compute RMS for center pulse
      let sumSquares = 0;
      for (let i = 0; i < timeArray.length; i++) {
        const v = (timeArray[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / timeArray.length);
      const level = Math.max(0, Math.min(1, (rms - 0.02) / 0.3));

      // Clear background
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const innerRadius = minDim * 0.28;
      const maxBarLength = minDim * 0.22;

      // Draw center pulse
      const pulseRadius = innerRadius * (0.7 + 0.25 * level);
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(80, 200, 255, ${0.15 + 0.35 * level})`;
      ctx.fill();

      // Draw radial bars (log-spaced)
      const indices = binIndexRef.current;
      const numBars = indices.length;
      ctx.lineCap = 'round';
      for (let i = 0; i < numBars; i++) {
        const idx = indices[i];
        const magnitude = (freqArray[idx] || 0) / 255;
        
        // Debug: Log bars that should be active but aren't
        if (import.meta.env.DEV && i % 10 === 0) { // Log every 10th bar to avoid spam
          console.log(`Bar ${i}: freq bin ${idx}, magnitude ${magnitude.toFixed(3)}, raw value ${freqArray[idx]}`);
        }
        
        // perceptual ease-in with minimum baseline activity
        const baselineActivity = 0.02; // Small amount to ensure all bars show some life
        const adjustedMagnitude = Math.max(baselineActivity, magnitude);
        const m = Math.pow(Math.max(0, adjustedMagnitude - 0.05) / 0.95, 0.8);
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const length = innerRadius + m * maxBarLength;
        const x0 = cx + Math.cos(angle) * innerRadius;
        const y0 = cy + Math.sin(angle) * innerRadius;
        const x1 = cx + Math.cos(angle) * length;
        const y1 = cy + Math.sin(angle) * length;

        // Color by angle with brightness by magnitude
        const hue = (220 + (i / numBars) * 120) % 360;
        const light = 45 + 30 * m;
        ctx.strokeStyle = `hsl(${hue}, 85%, ${light}%)`;
        ctx.lineWidth = Math.max(2, minDim * 0.006);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      vizFrameRef.current = requestAnimationFrame(draw);
    };

    // Start draw loop (it will keep running while stream is live)
    vizFrameRef.current = requestAnimationFrame(draw);
  }, []);

  const startStaticVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Build the same log-spaced bin indices for static display
    if (!binIndexRef.current) {
      const numBars = 48;
      const startIndex = 2;
      // Cap at reasonable frequency range for human audio (roughly 8kHz instead of full spectrum)
      const endIndex = Math.min(255, Math.floor(255 * 0.3));
      const availableRange = endIndex - startIndex;
      
      // Ensure we have enough unique bins for all bars
      const actualNumBars = Math.min(numBars, availableRange);
      
      const indices = [];
      const usedIndices = new Set();
      
      for (let i = 0; i < actualNumBars; i++) {
        const t = i / (actualNumBars - 1);
        const ratio = Math.pow(endIndex / startIndex, t);
        let idx = Math.min(endIndex, Math.max(startIndex, Math.floor(startIndex * ratio)));
        
        // Ensure uniqueness - if this index is already used, find the next available one
        while (usedIndices.has(idx) && idx <= endIndex) {
          idx++;
        }
        
        if (idx <= endIndex) {
          indices.push(idx);
          usedIndices.add(idx);
        }
      }
      
      // If we have fewer unique indices than requested bars, pad with remaining available indices
      if (indices.length < numBars) {
        for (let idx = startIndex; idx <= endIndex && indices.length < numBars; idx++) {
          if (!usedIndices.has(idx)) {
            indices.push(idx);
            usedIndices.add(idx);
          }
        }
      }
      
      binIndexRef.current = indices;
    }

    const drawStatic = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear background
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const innerRadius = minDim * 0.28;
      const maxBarLength = minDim * 0.22;

      // Draw center pulse (static, resting state)
      const level = 0; // No audio, so level is 0
      const pulseRadius = innerRadius * (0.7 + 0.25 * level);
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(80, 200, 255, ${0.15 + 0.35 * level})`;
      ctx.fill();

      // Draw radial bars (static, minimal length)
      const indices = binIndexRef.current;
      const numBars = indices.length;
      ctx.lineCap = 'round';
      for (let i = 0; i < numBars; i++) {
        const magnitude = 0; // No audio data
        const m = Math.pow(Math.max(0, magnitude - 0.05) / 0.95, 0.8);
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const length = innerRadius + m * maxBarLength;
        const x0 = cx + Math.cos(angle) * innerRadius;
        const y0 = cy + Math.sin(angle) * innerRadius;
        const x1 = cx + Math.cos(angle) * length;
        const y1 = cy + Math.sin(angle) * length;

        // Color by angle with brightness by magnitude (dim for static)
        const hue = (220 + (i / numBars) * 120) % 360;
        const light = 45 + 30 * m;
        ctx.strokeStyle = `hsl(${hue}, 85%, ${light}%)`;
        ctx.lineWidth = Math.max(2, minDim * 0.006);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    };

    drawStatic();
  }, []);

  // Keep the visualization canvas sized to its container at device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const resize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) return;
      const displayW = Math.floor(cw * dpr);
      const displayH = Math.floor(ch * dpr);
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('resize', resize);
    return () => {
      try { ro.disconnect(); } catch (e) { /* ignore */ }
      window.removeEventListener('resize', resize);
    };
  }, [status]);

  // Start/stop visualizer based on status and stream
  useEffect(() => {
    if (status === 'in-progress' && remoteStream) {
      startLiveVisualizer(remoteStream);
    } else {
      stopVisualizer();
      // Show static version when not in progress
      setTimeout(() => startStaticVisualizer(), 50); // Small delay to ensure canvas is ready
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, remoteStream]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`equalizer ${status === 'in-progress' ? 'active' : ''}`}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', background: '#0b0f1a' }}
        />
      </div>
    </div>
  );
}
