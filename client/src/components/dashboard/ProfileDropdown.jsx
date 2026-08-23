import React, { useEffect, useRef, useState } from 'react';
import AppIcon from '../ui/AppIcon';

export default function ProfileDropdown({ athlete, onSelectTab, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!athlete) return null;

  const initial = athlete.fullName?.charAt(0)?.toUpperCase() || 'A';

  const select = (tab) => {
    setOpen(false);
    onSelectTab?.(tab);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-[#1d2a3d] bg-[#0b1220] px-2.5 py-1.5 text-left transition hover:border-[#74c9ff]/40 hover:bg-[#0e1726] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4ff4d]/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16273e] text-sm font-black text-[#d4ff4d]">
          {initial}
        </span>
        <span className="hidden md:block min-w-0">
          <span className="block max-w-[120px] truncate text-xs font-bold text-white">{athlete.fullName}</span>
          <span className="block max-w-[120px] truncate text-[10px] text-[#7a8aa7]">{athlete.primarySport || 'Athlete'}</span>
        </span>
        <AppIcon name="chevron" size={14} className={`text-[#7a8aa7] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="kp-dropdown-enter absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-2xl border border-[#263650] bg-[#0a1220]/98 p-1.5 shadow-2xl backdrop-blur-xl"
          role="menu"
        >
          <div className="border-b border-[#1d2a3d] px-3 py-3">
            <p className="truncate text-sm font-black text-white">{athlete.fullName}</p>
            <p className="truncate text-[11px] text-[#7a8aa7]">{athlete.location || 'Athlete Portal'}</p>
          </div>
          <button type="button" role="menuitem" onClick={() => select('profile')} className="kp-dropdown-item">
            <AppIcon name="person" size={16} /><span>My Profile</span>
          </button>
          <button type="button" role="menuitem" onClick={() => select('progress')} className="kp-dropdown-item">
            <AppIcon name="trend" size={16} /><span>Progress History</span>
          </button>
          <button type="button" role="menuitem" onClick={() => select('settings')} className="kp-dropdown-item">
            <AppIcon name="settings" size={16} /><span>Settings</span>
          </button>
          <div className="my-1 border-t border-[#1d2a3d]" />
          <button type="button" role="menuitem" onClick={onLogout} className="kp-dropdown-item text-[#ffb4c1] hover:text-[#ffced6]">
            <AppIcon name="logout" size={16} /><span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
