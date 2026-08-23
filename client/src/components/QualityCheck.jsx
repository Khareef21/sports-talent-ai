import React, { useEffect, useState } from 'react';
import AppIcon from './ui/AppIcon';

const CHECKS = [
  { key: 'person_detected',   label: 'Person detected' },
  { key: 'full_body_visible', label: 'Full body visible' },
  { key: 'feet_visible',      label: 'Feet visible' },
  { key: 'enough_frames',     label: 'Sufficient video length' },
  { key: 'movement_detected', label: 'Movement detected' },
];

const DELAY_MS = 400; // stagger each check appearance

export default function QualityCheck({ qualityChecks, onPass, onFail, extraChecks = [], errorMessage, isLongJump = false }) {
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!qualityChecks) return;

    const visibleChecks = [
      ...CHECKS,
      ...extraChecks.filter((c) => qualityChecks && Object.prototype.hasOwnProperty.call(qualityChecks, c.key)),
    ];

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= visibleChecks.length) {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          const allPassed = visibleChecks.every((c) => qualityChecks[c.key] !== false);
          if (allPassed) onPass();
        }, 600);
      }
    }, DELAY_MS);

    return () => clearInterval(interval);
    }, [qualityChecks, extraChecks]);

  if (!qualityChecks) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" style={{borderWidth:'3px'}} />
        <p className="text-gray-400">Checking video quality…</p>
      </div>
    );
  }

  const visibleChecks = [
    ...CHECKS,
    ...extraChecks.filter((c) => Object.prototype.hasOwnProperty.call(qualityChecks, c.key)),
  ];
  const allPassed = visibleChecks.every((c) => qualityChecks[c.key] !== false);
  const failures = visibleChecks.filter((c) => qualityChecks[c.key] === false);

  const FAILURE_GUIDANCE = {
    person_detected:   'Ensure your full body is clearly visible. Improve lighting.',
    full_body_visible: 'Move farther from the camera so your entire body is in frame.',
    feet_visible:      'Ensure both feet are visible. Record from 2–4 m away.',
    enough_frames:     'Record at least 2 seconds of footage.',
    movement_detected: isLongJump
      ? 'Record one clear horizontal long-jump attempt with the take-off and landing visible.'
      : 'Perform a clear, full vertical jump during recording.',
    calibration_valid: 'Calibration failed. Keep the reference object fully visible on the same ground plane and record again.',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
        Video Quality Check
      </h3>

      <div className="space-y-2">
        {visibleChecks.map((check, idx) => {
          if (idx >= revealed) return null;
          const passed = qualityChecks[check.key] !== false;
          return (
            <div
              key={check.key}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                passed
                  ? 'bg-green-950/40 border-green-800/50 text-green-300'
                  : 'bg-red-950/40 border-red-800/50 text-red-300'
              }`}
            >
              <span className="text-lg">
                <AppIcon name={passed ? 'check' : 'x'} size={18} />
              </span>
              <span className="text-sm font-medium">{check.label}</span>
            </div>
          );
        })}
      </div>

      {done && (
        <div className="mt-4">
          {allPassed ? (
            <div className="bg-green-950/50 border border-green-700 rounded-xl p-4 text-center">
              <p className="text-green-400 font-bold text-lg flex items-center justify-center gap-2"><AppIcon name="check" size={18} /> Video ready for analysis</p>
              <p className="text-green-300/70 text-sm mt-1">Running pose estimation and physics…</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-950/50 border border-red-700 rounded-xl p-4">
                <p className="text-red-400 font-bold mb-2">
                  {failures.some((f) => f.key === 'calibration_valid')
                    ? 'Calibration failed. Keep the configured reference marker visible on the ground throughout the jump.'
                    : 'Video quality insufficient for reliable measurement'}
                </p>
                {errorMessage && failures.some((f) => f.key === 'calibration_valid') && (
                  <p className="text-xs text-red-200/80 mb-2">{errorMessage}</p>
                )}
                <ul className="space-y-1">
                  {failures.map((f) => (
                    <li key={f.key} className="text-sm text-red-300 flex items-start gap-2">
                      <AppIcon name="arrow" size={14} className="mt-0.5 shrink-0" />
                      <span>{FAILURE_GUIDANCE[f.key] || f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={onFail}
                className="w-full bg-gray-700 hover:bg-gray-600 transition py-3 rounded-xl font-bold text-sm"
              >
                <><AppIcon name="refresh" size={15} /> Record / Upload Again</>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
