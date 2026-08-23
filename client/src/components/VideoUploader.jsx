import React, { useState, useRef, useCallback } from 'react';
import AppIcon from './ui/AppIcon';

const MAX_DURATION_SEC = 60;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_EXT = ['.mp4', '.mov', '.webm'];

function formatDuration(sec) {
  const s = Math.floor(sec);
  const ms = Math.round((sec - s) * 10);
  return `${s}.${ms}s`;
}

function validateFile(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXT.includes(ext);
  if (!typeOk) {
    return `Unsupported format "${ext}". Please use MP4, MOV, or WebM.`;
  }
  if (file.size > 200 * 1024 * 1024) {
    return 'File is too large (max 200 MB).';
  }
  return null;
}

export default function VideoUploader({ onVideoReady, onBack }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  const [durationError, setDurationError] = useState(null);

  const inputRef = useRef(null);
  const previewRef = useRef(null);

  const handleFile = useCallback((file) => {
    setError(null);
    setDurationError(null);
    setVideoFile(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setDuration(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFile(file);

    // Check duration via a hidden video element
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.src = url;
    vid.onloadedmetadata = () => {
      const d = vid.duration;
      setDuration(d);
      if (d > MAX_DURATION_SEC) {
        setDurationError(
          `Video is ${d.toFixed(1)}s long. Please upload a video of 60 seconds (1 min) or less.`
        );
      }
      URL.revokeObjectURL(vid.src);
    };
    vid.onerror = () => {
      setError('Could not read the video file. Please try a different file.');
    };
  }, [videoUrl]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const retake = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoFile(null);
    setDuration(null);
    setError(null);
    setDurationError(null);
  };

  const canContinue = videoFile && !durationError && !error && duration !== null && duration <= MAX_DURATION_SEC;

  return (
    <div className="space-y-4">
      {/* Format hint */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm">
        <p className="text-blue-400 font-semibold mb-1 flex items-center gap-2"><AppIcon name="report" size={15} /> Video Requirements</p>
        <ul className="text-gray-400 space-y-0.5 text-xs">
          <li>• Formats: MP4, MOV, WebM</li>
          <li>• Duration: Up to 1 minute (60 seconds max)</li>
          <li>• Full body visible, both feet in frame</li>
          <li>• One clear assessment attempt</li>
        </ul>
      </div>

      {/* Drop zone — shown when no file selected */}
      {!videoFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-950/40'
              : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-white font-semibold">Drop video here</p>
              <p className="text-gray-400 text-sm mt-1">or <span className="text-blue-400 underline">browse files</span></p>
            </div>
            <p className="text-xs text-gray-600">MP4 · MOV · WebM · Max 1 minute (60s)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-950/60 border border-red-700 rounded-xl p-3 text-sm text-red-300">
          <p className="font-semibold flex items-center gap-2"><AppIcon name="warning" size={15} /> {error}</p>
          <button onClick={retake} className="mt-1 text-xs underline text-red-400">Try another file</button>
        </div>
      )}

      {durationError && (
        <div className="bg-red-950/60 border border-red-700 rounded-xl p-3 text-sm text-red-300">
          <p className="font-semibold flex items-center gap-2"><AppIcon name="trend" size={15} /> {durationError}</p>
          <button onClick={retake} className="mt-1 text-xs underline text-red-400">Choose another file</button>
        </div>
      )}

      {/* Preview */}
      {videoUrl && videoFile && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-xl overflow-hidden border border-gray-700 aspect-video">
            <video
              ref={previewRef}
              src={videoUrl}
              controls
              loop
              className="w-full h-full object-contain"
            />
          </div>
          <div className="bg-gray-800/60 rounded-xl p-3 flex justify-between text-sm">
            <div>
              <p className="text-xs text-gray-500">File</p>
              <p className="text-white font-medium truncate max-w-[180px]">{videoFile.name}</p>
            </div>
            {duration !== null && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Duration</p>
                <p className={`font-bold ${duration <= MAX_DURATION_SEC ? 'text-green-400' : 'text-red-400'}`}>
                  {formatDuration(duration)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {videoFile && (
          <button
            onClick={retake}
            className="flex-1 bg-gray-700 hover:bg-gray-600 transition py-3 rounded-xl font-bold text-sm"
          >
            <><AppIcon name="refresh" size={15} /> Choose Another</>
          </button>
        )}
        <button
          onClick={() => canContinue && onVideoReady(videoFile, 'upload')}
          disabled={!canContinue}
          className={`flex-1 py-3 rounded-xl font-bold transition text-sm ${
            canContinue
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-700 opacity-40 cursor-not-allowed text-gray-400'
          }`}
        >
          <><AppIcon name="check" size={15} /> Analyze</>
        </button>
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
