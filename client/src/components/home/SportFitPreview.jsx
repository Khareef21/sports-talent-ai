import React from 'react';
import ProgressBar from '../ui/ProgressBar';

export default function SportFitPreview() {
  const demo = [
    { label: 'Volleyball', pct: 68 },
    { label: 'Basketball', pct: 72 },
    { label: 'Athletics', pct: 81 },
    { label: 'Football', pct: 60 },
  ];

  return (
    <section className="kp-section" style={{ paddingTop: 52 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">Sport fit</div>
          <h3 className="kp-card-title">Clear match signals for position fit.</h3>
        </div>
      </div>

      <div className="kp-card-soft p-6 space-y-4">
        {demo.map((item) => (
          <ProgressBar key={item.label} label={item.label} pct={item.pct} />
        ))}
      </div>
    </section>
  );
}
