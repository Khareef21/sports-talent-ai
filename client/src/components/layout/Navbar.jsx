import React from 'react';

function AthleteXLogo() {
  return (
    <svg viewBox="0 0 92 92" className="kp-brand-logo-svg" aria-hidden="true">
      <defs>
        <linearGradient id="athletex-blue" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#7be3ff" />
          <stop offset="45%" stopColor="#2fb5ff" />
          <stop offset="100%" stopColor="#1788ff" />
        </linearGradient>
      </defs>
      <path d="M19 70L44 16H51L72 70H60L54 55H41L35 70H19ZM43 47H52L47 33L43 47Z" fill="url(#athletex-blue)" />
      <path d="M30 63L48 42L59 55L64 50L84 71L75 80L55 60L44 72L30 63Z" fill="url(#athletex-blue)" opacity="0.9"/>
      <path d="M48 25L41 36H54L48 25Z" fill="#09233a" opacity="0.8"/>
      <path d="M18 20C28 25 32 31 36 40C26 46 18 52 12 60C10 42 11 30 18 20Z" fill="#0d2948" opacity="0.9"/>
      <circle cx="49" cy="22" r="5" fill="#0b1c2d" opacity="0.8"/>
      <path d="M43 30C47 30 49 31 52 33C53 39 53 46 50 52C48 49 46 47 43 45C42 39 42 34 43 30Z" fill="#0b1c2d" opacity="0.8"/>
    </svg>
  );
}

export default function Navbar() {
  return (
    <header className="kp-nav">
      <div className="kp-nav-inner">
        <a href="#top" className="kp-brand" aria-label="AthleteX home">
          <span className="kp-brand-mark"><AthleteXLogo /></span>
          <span className="kp-brand-stack">
            <span className="kp-brand-name">AthleteX</span>
            <span className="kp-brand-sub">Athlete Portal</span>
          </span>
        </a>

        <nav className="kp-nav-links" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#assessment">Assessment</a>
          <a href="#discover">Discover Talent</a>
          <a href="#scout">Scouts</a>
          <a href="#ai-lab">AI Lab</a>
          <a href="#about">About</a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="kp-button-ghost hidden sm:inline-flex">Log in</button>
          <button className="kp-button">Start Assessment</button>
        </div>
      </div>
    </header>
  );
}
