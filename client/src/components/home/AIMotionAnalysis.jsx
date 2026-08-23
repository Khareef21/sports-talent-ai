import React from 'react';

export default function AIMotionAnalysis() {
  const labels = ['Video Input', 'Pose Detection', '3D Reconstruction', 'Biomechanics', 'Performance Metrics', 'Talent Intelligence'];

  return (
    <section id="ai-lab" className="kp-section" style={{ paddingTop: 52 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">AI motion analysis</div>
          <h3 className="kp-card-title">Performance intelligence at each phase.</h3>
        </div>
      </div>

      <div className="kp-grid-2" style={{ alignItems: 'stretch' }}>
        <div className="kp-card p-5" style={{ minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <span className="kp-pill active">Pipeline</span>
            <span className="kp-mono text-[#7df9ff]">MediaPipe → Physics</span>
          </div>
          <div style={{ height: 220, borderRadius: 20, background: 'linear-gradient(135deg, rgba(116,201,255,0.12), rgba(212,255,77,0.08)), rgba(11,17,29,0.82)', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', placeItems: 'center', color: '#a1afc7' }}>
            <div className="kp-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Pose & biomechanics engine
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {labels.map((label, index) => (
            <div key={label} className="kp-card-soft p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="font-medium text-white">{label}</span>
              <span className="kp-mono" style={{ color: '#d4ff4d', fontSize: '0.7rem' }}>{String(index + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
