import React, { useState, useRef, useEffect, useCallback } from 'react';
import AppIcon from './ui/AppIcon';

const RECORDING_LIMIT_SEC = 60;
const RECOMMENDED_SEC = 3;

const INSTRUCTIONS = [
  { icon: 'ruler', text: 'Stand 2–4 m from camera' },
  { icon: 'person', text: 'Keep full body visible' },
  { icon: 'camera', text: 'Keep camera stable' },
  { icon: 'trend', text: 'Perform one clear jump' },
];

export default function CameraRecorder({ onVideoReady, onBack }) {
  const [phase, setPhase] = useState('idle'); // idle | streaming | recording | preview
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);

  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase('streaming');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(
          'Camera permission was denied. Please allow camera access in your browser settings, or use the "Upload Video" option instead.'
        );
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please use the "Upload Video" option instead.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // Pick best supported codec
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    try {
      const mr = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(url);
        setPhase('preview');
        stopStream();
      };

      mr.start(100); // collect data every 100ms
      startTimeRef.current = Date.now();
      setElapsed(0);
      setPhase('recording');

      // Timer
      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
        if (secs >= RECORDING_LIMIT_SEC) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setError(`Recording error: ${err.message}`);
    }
  };

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setPhase('stopping');
  }, []);

  const retake = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
    setElapsed(0);
    setError(null);
    setPhase('idle');
  };

  const continueToAnalysis = () => {
    if (videoBlob) onVideoReady(videoBlob, 'camera');
  };

  const timerColor =
    elapsed >= RECORDING_LIMIT_SEC - 5
      ? 'text-red-400'
      : elapsed >= RECOMMENDED_SEC
      ? 'text-yellow-400'
      : 'text-green-400';

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
        <p className="text-xs text-blue-400 font-semibold uppercase mb-2">Recording Tips</p>
        <div className="grid grid-cols-2 gap-2">
          {INSTRUCTIONS.map((tip) => (
            <div key={tip.text} className="flex items-center gap-2 text-xs text-gray-300">
              <AppIcon name={tip.icon} size={15} className="text-[#74c9ff] shrink-0" />
              <span>{tip.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-300 mt-2 font-medium">
          <span className="inline-flex items-center gap-1.5"><AppIcon name="target" size={14} /> Maximum recording duration: 60 seconds (1 minute).</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-700 rounded-xl p-4 text-sm text-red-300">
          <p className="font-semibold mb-1 flex items-center gap-2"><AppIcon name="warning" size={15} /> Camera Error</p>
          <p>{error}</p>
          <button
            onClick={onBack}
            className="mt-2 text-xs underline text-red-400 hover:text-red-300"
          >
            ← Use Upload Video instead
          </button>
        </div>
      )}

      {/* Video element — hidden when in preview */}
      {phase !== 'preview' && (
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-gray-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Guide overlay */}
          {(phase === 'streaming' || phase === 'recording') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-dashed border-white/30 rounded-lg"
                style={{ width: '60%', height: '85%' }}
              />
            </div>
          )}

          {/* Recording indicator */}
          {phase === 'recording' && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className={`text-sm font-mono font-bold ${timerColor}`}>
                {elapsed.toFixed(1)}s / 60s
              </span>
            </div>
          )}

          {/* Idle state */}
          {phase === 'idle' && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-sm">Camera preview will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {phase === 'preview' && videoUrl && (
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-green-800">
          <video
            ref={previewRef}
            src={videoUrl}
            controls
            loop
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded-full">
            <><AppIcon name="check" size={15} /> Recorded ({elapsed.toFixed(1)}s)</>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {phase === 'idle' && !error && (
          <button
            onClick={startCamera}
            className="flex-1 bg-blue-600 hover:bg-blue-500 transition py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            Enable Camera
          </button>
        )}

        {phase === 'streaming' && (
          <button
            onClick={startRecording}
            className="flex-1 bg-red-600 hover:bg-red-500 transition py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-white" />
            Start Recording
          </button>
        )}

        {phase === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 transition py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded bg-white" />
            Stop Recording
          </button>
        )}

        {phase === 'stopping' && (
          <div className="flex-1 bg-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 opacity-70">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        )}

        {phase === 'preview' && (
          <>
            <button
              onClick={retake}
              className="flex-1 bg-gray-700 hover:bg-gray-600 transition py-3 rounded-xl font-bold"
            >
              <><AppIcon name="refresh" size={15} /> Retake</>
            </button>
            <button
              onClick={continueToAnalysis}
              className="flex-1 bg-green-600 hover:bg-green-500 transition py-3 rounded-xl font-bold"
            >
              <><AppIcon name="check" size={15} /> Analyze</>
            </button>
          </>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full text-sm text-gray-500 hover:text-gray-300 transition py-1"
      >
        ← Back
      </button>
    </div>
  );
}