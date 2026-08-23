import React from 'react';

export default function CTA() {
  return (
    <section className="kp-section" style={{ paddingTop: 52, paddingBottom: 32 }}>
      <div className="kp-card p-8 text-center" style={{ borderColor: 'rgba(212,255,77,0.2)' }}>
        <div className="kp-kicker" style={{ justifyContent: 'center' }}>Ready to assess</div>
        <h3 className="text-3xl font-black text-white">Find the kinetic edge before the next shortlist.</h3>
        <p className="mt-3 text-[#a1afc7] max-w-2xl mx-auto">
          Assess explosive potential in minutes using a single smartphone video and real biomechanics-driven analysis.
        </p>
        <div className="mt-6 flex justify-center">
          <button className="kp-button">Assess Your Jump</button>
        </div>
      </div>
    </section>
  );
}
