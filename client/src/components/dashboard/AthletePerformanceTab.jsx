import React from 'react';

const metrics = [
  ['Overall rating', '84', 'text-[#d4ff4d]'],
  ['Speed', '91', 'text-[#74c9ff]'],
  ['Acceleration', '88', 'text-white'],
  ['Agility', '82', 'text-white'],
  ['Strength', '76', 'text-white'],
  ['Endurance', '79', 'text-white'],
  ['Skill rating', '86', 'text-[#d4ff4d]'],
  ['Reaction time', '0.31s', 'text-[#74c9ff]'],
];

export default function AthletePerformanceTab({ assessments = [] }) {
  return <div className="space-y-6"><div className="kp-card kp-card-hoverable p-6 border-l-4 border-l-[#d4ff4d]"><div className="kp-kicker">Performance Analytics</div><h2 className="text-3xl font-black text-white">Your performance profile</h2><p className="text-sm text-[#a1afc7] mt-2">A practical snapshot of validated movement data and self-reported development signals.</p></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{metrics.map(([label, value, color]) => <div key={label} className="kp-card kp-card-hoverable p-4"><p className="text-[10px] uppercase font-bold text-[#7a8aa7]">{label}</p><p className={`text-2xl font-black mt-2 ${color}`}>{value}</p><div className="h-1.5 bg-[#0b1220] rounded-full mt-3"><div className="h-full bg-current rounded-full" style={{ width: `${label === 'Reaction time' ? 76 : value}%` }} /></div></div>)}</div><div className="grid lg:grid-cols-[1.4fr_1fr] gap-5"><div className="kp-card kp-card-hoverable p-5"><div className="flex justify-between items-center"><div><div className="kp-kicker">Trend</div><h3 className="text-xl font-black text-white">Performance over time</h3></div><span className="kp-pill active">+8% this season</span></div><div className="h-48 mt-5 flex items-end gap-3 border-b border-l border-[#1d2a3d] px-3">{[48, 56, 52, 67, 64, 76, 82, 84].map((height, index) => <div key={index} className="flex-1 bg-gradient-to-t from-[#74c9ff] to-[#d4ff4d] rounded-t-sm opacity-80" style={{ height: `${height}%` }} />)}</div><div className="flex justify-between text-[10px] text-[#7a8aa7] mt-2"><span>Jan</span><span>Apr</span><span>Aug</span></div></div><div className="kp-card kp-card-hoverable p-5"><div className="kp-kicker">Assessment history</div><h3 className="text-xl font-black text-white mb-4">Recent validated trials</h3>{assessments.length ? assessments.slice(0, 4).map((record) => <div key={record.id} className="flex justify-between py-3 border-b border-[#1d2a3d] text-sm"><span className="text-[#a1afc7]">{record.testName}</span><strong className="text-[#d4ff4d]">{record.resultData?.metrics?.distance_m || record.resultData?.metrics?.jump_height_cm || '--'}{record.testType === 'LONG_JUMP' ? ' m' : ' cm'}</strong></div>) : <p className="text-sm text-[#a1afc7]">Complete an assessment to populate your validated trend.</p>}</div></div></div>;
}
