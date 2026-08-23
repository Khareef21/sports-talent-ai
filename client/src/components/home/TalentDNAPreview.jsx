import React from 'react';
import RadarPlaceholder from '../ui/RadarPlaceholder';

export default function TalentDNAPreview() {
  return (
    <section id="discover" className="kp-section" style={{ paddingTop: 52 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">Talent DNA</div>
          <h3 className="kp-card-title">Scout-ready athletic profile summary.</h3>
        </div>
      </div>

      <div className="kp-grid-2" style={{ alignItems: 'stretch' }}>
        <RadarPlaceholder />
        <div className="kp-card-soft p-6">
          <div className="text-lg font-bold text-white mb-4">Top attributes</div>
          <ul className="text-sm text-[#a1afc7] space-y-3">
            {['Power', 'Agility', 'Speed', 'Balance', 'Explosiveness', 'Movement Quality'].map((item) => (
              <li key={item} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                <span>{item}</span>
                <span className="kp-mono text-[#d4ff4d]">{Math.max(68, 82 - item.length)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
