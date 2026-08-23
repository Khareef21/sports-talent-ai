import React from 'react';

export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`kp-card-soft ${className}`} style={{ backdropFilter: 'blur(18px)' }}>
      {children}
    </div>
  );
}
