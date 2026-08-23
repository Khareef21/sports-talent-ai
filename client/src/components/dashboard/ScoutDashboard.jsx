import React, { useState } from 'react';
import AppIcon from '../ui/AppIcon';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'athletes', label: 'Athlete Pool', icon: 'users' },
  { id: 'reports', label: 'Reports', icon: 'report' },
  { id: 'watchlist', label: 'Watchlist', icon: 'star' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function AthleteXLogo() {
  return (
    <svg viewBox="0 0 92 92" className="kp-brand-logo-svg" aria-hidden="true">
      <defs>
        <linearGradient id="athletex-blue-scout" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#7be3ff" />
          <stop offset="45%" stopColor="#2fb5ff" />
          <stop offset="100%" stopColor="#1788ff" />
        </linearGradient>
      </defs>
      <path d="M19 70L44 16H51L72 70H60L54 55H41L35 70H19ZM43 47H52L47 33L43 47Z" fill="url(#athletex-blue-scout)" />
      <path d="M30 63L48 42L59 55L64 50L84 71L75 80L55 60L44 72L30 63Z" fill="url(#athletex-blue-scout)" opacity="0.9"/>
      <path d="M48 25L41 36H54L48 25Z" fill="#09233a" opacity="0.8"/>
      <path d="M18 20C28 25 32 31 36 40C26 46 18 52 12 60C10 42 11 30 18 20Z" fill="#0d2948" opacity="0.9"/>
      <circle cx="49" cy="22" r="5" fill="#0b1c2d" opacity="0.8"/>
      <path d="M43 30C47 30 49 31 52 33C53 39 53 46 50 52C48 49 46 47 43 45C42 39 42 34 43 30Z" fill="#0b1c2d" opacity="0.8"/>
    </svg>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="kp-card kp-card-hoverable p-10 text-center">
      <div className="mb-3"><AppIcon name={icon} size={34} className="mx-auto text-[#74c9ff]" /></div>
      <h3 className="text-xl font-black text-white mb-2">{title}</h3>
      <p className="text-sm text-[#a1afc7] max-w-md mx-auto mb-5">{description}</p>
      {action && <button className="kp-button py-2.5 px-5 text-sm">{action}</button>}
    </div>
  );
}

export default function ScoutDashboard({ scout, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="kp-shell min-h-screen flex flex-col">
      <header className="bg-[#070d18] border-b border-[#1d2a3d] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between min-h-16 py-2 gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="kp-brand-mark" style={{ width: 46, height: 46, borderRadius: 14 }}>
                <AthleteXLogo />
              </div>
              <div className="kp-brand-stack" style={{ transform: 'translateY(-1px)' }}>
                <h1 className="kp-brand-name text-base" style={{ fontSize: '1.02rem' }}>AthleteX</h1>
                <p className="kp-brand-sub" style={{ fontSize: '0.46rem', letterSpacing: '0.2em' }}>Scout Workspace</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeTab === item.id ? 'bg-[#0f1c2d] text-[#74c9ff] border border-[#74c9ff]/30' : 'text-[#a1afc7] hover:text-white hover:bg-[#0b1220]'}`}
                >
                  <AppIcon name={item.icon} size={15} /><span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right text-xs">
                <p className="font-bold text-white">{scout.fullName}</p>
                <p className="text-[10px] text-[#7a8aa7]">Recruiter ID: {scout.recruiterId || 'Not provided'}</p>
              </div>
              <button onClick={onLogout} title="Sign Out" className="text-xs text-[#7a8aa7] hover:text-[#ffb4c1]"><AppIcon name="logout" size={15} /></button>
            </div>
          </div>
          <div className="md:hidden flex gap-1 overflow-x-auto py-2 border-t border-[#1d2a3d]/50 no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap ${activeTab === item.id ? 'bg-[#0f1c2d] text-[#74c9ff]' : 'text-[#a1afc7]'}`}>
                <AppIcon name={item.icon} size={14} /> {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="kp-card kp-card-hoverable p-6 border-l-4 border-l-[#74c9ff]">
              <div className="kp-kicker">Scouting Operations</div>
              <h2 className="text-3xl font-black text-white mt-1">Good to see you, {scout.fullName}.</h2>
              <p className="text-sm text-[#a1afc7] mt-2">Review verified athlete assessments, compare performance signals, and build your scouting pipeline.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="kp-card kp-card-hoverable p-5"><p className="text-xs text-[#a1afc7] uppercase font-bold">Athletes tracked</p><p className="text-3xl font-black text-white mt-2">0</p><p className="text-xs text-[#7a8aa7] mt-1">Connect an athlete pool to begin</p></div>
              <div className="kp-card kp-card-hoverable p-5"><p className="text-xs text-[#a1afc7] uppercase font-bold">Verified reports</p><p className="text-3xl font-black text-[#d4ff4d] mt-2">0</p><p className="text-xs text-[#7a8aa7] mt-1">Validated assessments only</p></div>
              <div className="kp-card kp-card-hoverable p-5"><p className="text-xs text-[#a1afc7] uppercase font-bold">Watchlist</p><p className="text-3xl font-black text-[#74c9ff] mt-2">0</p><p className="text-xs text-[#7a8aa7] mt-1">Shortlisted prospects</p></div>
            </div>
            <EmptyState icon="search" title="Your scouting pool is empty" description="Athletes and verified assessment reports will appear here when your team connects an athlete cohort or imports scouting records." action="Add Athlete Cohort" />
          </div>
        )}
        {activeTab === 'athletes' && <EmptyState icon="users" title="No athletes connected" description="Create a cohort or invite athletes to review their validated AthleteX assessments." action="Connect Athletes" />}
        {activeTab === 'reports' && <EmptyState icon="report" title="No reports yet" description="Verified athlete reports will be available here for comparison and export." />}
        {activeTab === 'watchlist' && <EmptyState icon="star" title="Your watchlist is empty" description="Shortlist athletes from the Athlete Pool when you find a prospect worth tracking." />}
        {activeTab === 'settings' && <div className="kp-card kp-card-hoverable p-6 max-w-2xl"><div className="kp-kicker">Workspace Settings</div><h2 className="text-2xl font-black text-white mt-1">Scouting team profile</h2><p className="text-sm text-[#a1afc7] mt-2">Signed in as {scout.fullName}. Team permissions and athlete access controls can be configured here.</p></div>}
      </main>
    </div>
  );
}
