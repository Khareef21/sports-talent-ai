import React from 'react';
import { ASSETS } from '../../lib/assets';

export default function Hero() {
  return (
    <section id="top" className="kp-section kp-hero">
      <div className="kp-hero-copy">
        <span className="kp-kicker">Kinetic Precision</span>
        <h1>Discover athletic talent before it’s discovered.</h1>
        <p>
          AI-powered motion intelligence using smartphone video and biomechanics to surface
          explosive potential, movement quality, and player fit for real scouting decisions.
        </p>

        <div className="kp-cta-row">
          <button className="kp-button">Start Assessment</button>
          <button className="kp-button-ghost">Explore Technology</button>
        </div>
      </div>

      <div className="kp-hero-visual" aria-label="Athlete performance preview"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url('${ASSETS.hero.main}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="kp-visual-surface">
          <div className="kp-graph">
            <div className="kp-card-header" style={{ marginBottom: 14 }}>
              <div>
                <div className="kp-subtle" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Talent Snapshot
                </div>
                <strong style={{ fontSize: '1.4rem' }}>Vertical Jump</strong>
              </div>
              <span className="kp-pill active">92% Confidence</span>
            </div>

            <div className="kp-metric-grid">
              <div className="kp-metric">
                <span className="kp-metric-label">Height</span>
                <span className="kp-metric-value" style={{ color: '#d4ff4d' }}>34.8</span>
              </div>
              <div className="kp-metric">
                <span className="kp-metric-label">Flight</span>
                <span className="kp-metric-value" style={{ color: '#7df9ff' }}>0.53s</span>
              </div>
              <div className="kp-metric">
                <span className="kp-metric-label">Sprint</span>
                <span className="kp-metric-value" style={{ color: '#b78cff' }}>8.6</span>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="kp-subtle" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Movement profile
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {[
                  ['Power', 82],
                  ['Explosiveness', 76],
                  ['Coordination', 88],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: '#a1afc7' }}>
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,0.14)', overflow: 'hidden' }}>
                      <div style={{ width: `${value}%`, height: '100%', background: 'linear-gradient(90deg, #d4ff4d, #7df9ff)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
