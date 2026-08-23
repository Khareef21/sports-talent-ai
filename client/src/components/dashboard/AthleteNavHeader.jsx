import React, { useState } from 'react';
import AppIcon from '../ui/AppIcon';
import ProfileDropdown from './ProfileDropdown';

const PRIMARY_NAV_TABS = [
  { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
  { id: 'assessments', label: 'Assessments', icon: 'clipboard' },
  { id: 'performance', label: 'Performance', icon: 'trend' },
  { id: 'athlete_dna', label: 'Athlete DNA', icon: 'dna' },
  { id: 'opportunities', label: 'Opportunities', icon: 'target' },
];

const MORE_NAV_TABS = [
  { id: 'progress', label: 'Progress' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
];

function AthleteXLogo() {
  return (
    <svg viewBox="0 0 92 92" className="kp-brand-logo-svg" aria-hidden="true">
      <defs>
        <linearGradient
          id="athletex-blue-header"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#7be3ff" />
          <stop offset="45%" stopColor="#2fb5ff" />
          <stop offset="100%" stopColor="#1788ff" />
        </linearGradient>
      </defs>

      <path
        d="M19 70L44 16H51L72 70H60L54 55H41L35 70H19ZM43 47H52L47 33L43 47Z"
        fill="url(#athletex-blue-header)"
      />

      <path
        d="M30 63L48 42L59 55L64 50L84 71L75 80L55 60L44 72L30 63Z"
        fill="url(#athletex-blue-header)"
        opacity="0.9"
      />

      <path
        d="M48 25L41 36H54L48 25Z"
        fill="#09233a"
        opacity="0.8"
      />

      <path
        d="M18 20C28 25 32 31 36 40C26 46 18 52 12 60C10 42 11 30 18 20Z"
        fill="#0d2948"
        opacity="0.9"
      />

      <circle cx="49" cy="22" r="5" fill="#0b1c2d" opacity="0.8" />

      <path
        d="M43 30C47 30 49 31 52 33C53 39 53 46 50 52C48 49 46 47 43 45C42 39 42 34 43 30Z"
        fill="#0b1c2d"
        opacity="0.8"
      />
    </svg>
  );
}

export default function AthleteNavHeader({
  activeTab,
  onSelectTab,
  athlete,
  onLogout,
  onStartAssessment,
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleMoreSelect = (tabId) => {
    onSelectTab(tabId);
    setMoreOpen(false);
  };

  return (
    <header className="bg-[#070d18] border-b border-[#1d2a3d] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Main Navbar */}
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="kp-brand-mark"
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
              }}
            >
              <AthleteXLogo />
            </div>

            <div
              className="kp-brand-stack"
              style={{ transform: 'translateY(-1px)' }}
            >
              <h1
                className="kp-brand-name text-base"
                style={{ fontSize: '1.05rem' }}
              >
                AthleteX
              </h1>

              <p
                className="kp-brand-sub"
                style={{
                  fontSize: '0.48rem',
                  letterSpacing: '0.24em',
                }}
              >
                Athlete Portal
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center justify-center flex-1 gap-1 min-w-0"
            aria-label="Main navigation"
          >
            {PRIMARY_NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0f1c2d] text-[#d4ff4d] border border-[#d4ff4d]/30 shadow-[0_0_10px_rgba(212,255,77,0.08)]'
                      : 'text-[#a1afc7] hover:text-white hover:bg-[#0b1220]'
                  }`}
                >
                  <AppIcon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* More */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap text-[#a1afc7] hover:text-white hover:bg-[#0b1220]"
                aria-expanded={moreOpen}
              >
                <span>More</span>

                <AppIcon
                  name="chevron"
                  size={14}
                  className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[#1d2a3d] bg-[#0b1220] shadow-xl z-50 overflow-hidden">
                  {MORE_NAV_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleMoreSelect(tab.id)}
                        className={`block w-full px-4 py-3 text-left text-xs font-semibold transition ${
                          isActive
                            ? 'bg-[#0f1c2d] text-[#d4ff4d]'
                            : 'text-[#dfe9ff] hover:bg-[#101d2f]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3 shrink-0">

            {/* New Assessment */}
            <button
              type="button"
              onClick={onStartAssessment}
              className="kp-button kp-button-cta py-2 px-3 text-xs font-bold hidden sm:inline-flex items-center gap-2"
            >
              <AppIcon name="plus" size={15} strokeWidth={2.5} />

              <span>New Assessment</span>
            </button>

            {/* Athlete Profile */}
            <ProfileDropdown
              athlete={athlete}
              onSelectTab={(tabId) => onSelectTab(tabId)}
              onLogout={onLogout}
            />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-[#1d2a3d]/50 no-scrollbar">
          {[...PRIMARY_NAV_TABS, ...MORE_NAV_TABS].map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  setMoreOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#0f1c2d] text-[#d4ff4d] border border-[#d4ff4d]/30'
                    : 'text-[#a1afc7]'
                }`}
              >
                {tab.icon && <AppIcon name={tab.icon} size={13} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}