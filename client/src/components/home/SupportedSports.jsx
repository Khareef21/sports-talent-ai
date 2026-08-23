import React from 'react';

const sports = ['Volleyball', 'Basketball', 'Football', 'Athletics', 'Cricket', 'Tennis', 'Hockey'];

export default function SupportedSports() {
  return (
    <section className="kp-section" style={{ paddingTop: 52 }}>
      <div className="kp-section-header">
        <div>
          <div className="kp-kicker">Sports</div>
          <h3 className="kp-card-title">Built for high-performance pathways.</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sports.map((sport) => (
          <div key={sport} className="kp-card-soft p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold">{sport}</div>
              <div className="text-xs text-[#7a8aa7]">{sport === 'Athletics' ? 'Active' : 'Scouting'}</div>
            </div>
            {sport !== 'Athletics' && <span className="kp-pill">Soon</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
