import React from 'react';

export default function ProgressBar({ label, pct }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#a1afc7] mb-2">
        <span>{label}</span>
        <span className="kp-mono text-[#d4ff4d]">{pct}%</span>
      </div>
      <div className="w-full bg-[#101a2b] rounded-full h-2.5 overflow-hidden border border-white/5">
        <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d4ff4d, #7df9ff)' }} className="h-full rounded-full" />
      </div>
    </div>
  );
}
