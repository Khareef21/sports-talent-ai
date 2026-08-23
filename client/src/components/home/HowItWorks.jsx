import React from 'react';

export default function HowItWorks() {
  const steps = [
    { title: 'Record', desc: 'Capture one clean vertical jump clip on any smartphone.' },
    { title: 'Analyze', desc: 'Pose tracking and physics transform the video into measurable motion data.' },
    { title: 'Measure', desc: 'Flight time, jump height, and athlete confidence are computed in real time.' },
    { title: 'Discover', desc: 'Scouts get a verified performance snapshot ready for player development and recruitment.' },
  ];

  return (
    <section id="assessment" className="kp-section" style={{ paddingTop: 48 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">How it works</div>
          <h3 className="kp-card-title">From video to clear performance insight.</h3>
        </div>
      </div>

      <div className="kp-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
        {steps.map((step, idx) => (
          <div key={step.title} className="kp-card-soft p-6">
            <div className="kp-mono" style={{ color: '#d4ff4d', fontSize: '0.72rem', letterSpacing: '0.14em', marginBottom: 14 }}>
              0{idx + 1}
            </div>
            <div className="text-xl font-bold text-white mb-2">{step.title}</div>
            <p className="text-sm leading-6 text-[#a1afc7]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
