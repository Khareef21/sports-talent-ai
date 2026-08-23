import React from 'react';
import AppIcon from '../ui/AppIcon';

export default function PreTestInstructions({
  testType = 'VERTICAL_JUMP',
  refWidthM = 1.0,
  setRefWidthM,
  refHeightM = 0.5,
  setRefHeightM,
  demoMode = true,
  setDemoMode,
  onProceed,
  onBack,
}) {
  const isVerticalJump = testType === 'VERTICAL_JUMP';

  return (
    <div className="kp-card p-6 max-w-lg mx-auto">
      <button onClick={onBack} className="text-xs text-[#a1afc7] mb-4 hover:text-white transition flex items-center gap-1">
        ← Back to Test Selection
      </button>

      <div className="kp-kicker">Recording Protocol & Setup</div>
      <h2 className="text-2xl font-black text-white mb-2">
        {isVerticalJump ? 'Vertical Jump Protocol' : 'Long Jump Protocol'}
      </h2>
      <p className="text-sm text-[#a1afc7] mb-6">
        Follow these recording guidelines to ensure computer vision quality checks pass successfully.
      </p>

      {!isVerticalJump && (
        <div className="bg-[#0f1c2d] border border-[#74c9ff]/40 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <AppIcon name="target" size={18} />
            <h3 className="font-bold text-white text-sm tracking-wide uppercase">Long Jump Calibration</h3>
          </div>
          <p className="text-xs text-[#74c9ff] font-medium">
            Place the configured ArUco calibration marker flat on the same ground plane and keep it visible in the video.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="block text-[11px] text-[#a1afc7] font-bold">
              Reference width (m)
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="10"
                value={refWidthM}
                onChange={(e) => setRefWidthM && setRefWidthM(e.target.value)}
                className="mt-1 w-full bg-[#06121a] border border-[#1d2a3d] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#74c9ff] outline-none"
              />
            </label>
            <label className="block text-[11px] text-[#a1afc7] font-bold">
              Reference length (m)
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="10"
                value={refHeightM}
                onChange={(e) => setRefHeightM && setRefHeightM(e.target.value)}
                className="mt-1 w-full bg-[#06121a] border border-[#1d2a3d] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#74c9ff] outline-none"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-[#1d2a3d] flex items-center gap-2">
            <input
              type="checkbox"
              id="demo-mode-toggle"
              checked={demoMode}
              onChange={(e) => setDemoMode && setDemoMode(e.target.checked)}
              className="w-4 h-4 accent-[#74c9ff] rounded cursor-pointer"
            />
            <label htmlFor="demo-mode-toggle" className="text-xs text-white font-bold cursor-pointer">
              Enable Demo Calibration Mode (Development testing)
            </label>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="kp-card-soft p-4 flex gap-4 items-start">
          <div className="text-2xl bg-[#0f1c2d] w-10 h-10 rounded-full flex items-center justify-center border border-[#1d2a3d] shrink-0">
            <AppIcon name="camera" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">1. Camera Position & Stability</p>
            <p className="text-xs text-[#a1afc7] mt-1">
              Place smartphone on a stable surface or tripod 2–4 meters away at waist height. Keep the camera stationary.
            </p>
          </div>
        </div>

        <div className="kp-card-soft p-4 flex gap-4 items-start">
          <div className="text-2xl bg-[#0f1c2d] w-10 h-10 rounded-full flex items-center justify-center border border-[#1d2a3d] shrink-0">
            <AppIcon name="person" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">2. Full-Body Framing</p>
            <p className="text-xs text-[#a1afc7] mt-1">
              Your entire body from head to feet must remain inside the video frame during the entire movement.
            </p>
          </div>
        </div>

        <div className="kp-card-soft p-4 flex gap-4 items-start">
          <div className="text-2xl bg-[#0f1c2d] w-10 h-10 rounded-full flex items-center justify-center border border-[#1d2a3d] shrink-0">
            <AppIcon name="foot" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">3. Feet Visibility</p>
            <p className="text-xs text-[#a1afc7] mt-1">
              Ensure both feet are clearly visible against the floor during standing baseline, takeoff, and landing.
            </p>
          </div>
        </div>

        <div className="kp-card-soft p-4 flex gap-4 items-start">
          <div className="text-2xl bg-[#0f1c2d] w-10 h-10 rounded-full flex items-center justify-center border border-[#1d2a3d] shrink-0">
            <AppIcon name="run" size={20} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">4. Ground Reference Marker</p>
            <p className="text-xs text-[#a1afc7] mt-1">
              {isVerticalJump
                ? 'Stand still for 1 second, dip into a counter-movement squat, explode vertically, and land cleanly.'
                : 'Keep your ground reference marker fully visible on the ground plane during takeoff and landing.'}
            </p>
          </div>
        </div>
      </div>

      <button onClick={onProceed} className="kp-button w-full py-3 text-base">
        <><AppIcon name="check" size={16} /> I'm Ready — Choose Video Source</>
      </button>
    </div>
  );
}
