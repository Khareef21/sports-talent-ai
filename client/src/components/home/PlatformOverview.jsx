import React from 'react';
import GlassCard from '../ui/GlassCard';

export default function PlatformOverview() {
  const items = [
    { title: 'Motion AI', desc: 'Real-time pose and movement analysis from a single smartphone video.' },
    { title: 'Performance Engine', desc: 'Validated movement metrics that highlight explosive potential.' },
    { title: 'Scout Intelligence', desc: 'Actionable insights for coaches, scouts, and athlete development teams.' },
  ];

  return (
    <section id="platform" className="kp-section" style={{ paddingTop: 36 }}>
      <div className="kp-section-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="kp-kicker">Platform</div>
          <h3 className="kp-card-title">Built for the modern athlete pipeline.</h3>
        </div>
      </div>

      <div className="kp-grid-3">
        {items.map((item) => (
          <GlassCard key={item.title} className="p-6">
            <div className="kp-pill active" style={{ marginBottom: 14 }}>01</div>
            <div className="text-xl font-bold text-white mb-2">{item.title}</div>
            <p className="text-sm leading-6 text-[#a1afc7]">{item.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
