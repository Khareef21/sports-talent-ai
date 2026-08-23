import React from 'react';
import MetricCard from '../ui/MetricCard';

export default function PerformanceMetrics() {
  return (
    <section className="kp-section" style={{ paddingTop: 52 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">Performance</div>
          <h3 className="kp-card-title">What the platform measures.</h3>
        </div>
      </div>

      <div className="kp-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 18 }}>
        <MetricCard label="Explosive Power" value="34.8" unit="cm" sub="Vertical jump" />
        <MetricCard label="Jump Height" value="0.53" unit="s" sub="Flight time" />
        <MetricCard label="Takeoff" value="2.7" unit="m/s" sub="Velocity" />
        <MetricCard label="Confidence" value="92" unit="%" sub="Model quality" />
        <MetricCard label="Movement" value="A+" sub="Coordination" />
      </div>
    </section>
  );
}
