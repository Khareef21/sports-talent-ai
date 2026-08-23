import React from 'react';

export default function MetricCard({ label, value, unit, sub }) {
  return (
    <div className="kp-card-soft p-5 text-center">
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[#a1afc7] mb-2">{label}</p>
      <p className="text-3xl font-black text-white">
        {value}
        {unit && <span className="text-base font-medium text-[#a1afc7] ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-[#7a8aa7] mt-2">{sub}</p>}
    </div>
  );
}
