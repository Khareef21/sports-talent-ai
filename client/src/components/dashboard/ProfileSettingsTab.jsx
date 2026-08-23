import React, { useState } from 'react';
import AppIcon from '../ui/AppIcon';

export default function ProfileSettingsTab({ athlete, onUpdateProfile, onLogout }) {
  const [form, setForm] = useState({
    fullName: athlete.fullName || '',
    age: athlete.age || '',
    gender: athlete.gender || 'Male',
    location: athlete.location || '',
    primarySport: athlete.primarySport || 'Basketball',
    position: athlete.position || '',
  });
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(form);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="kp-card kp-card-hoverable p-6">
        <div className="kp-kicker">Profile Settings</div>
        <h2 className="text-2xl font-black text-white mb-2">Athlete Account Details</h2>
        <p className="text-sm text-[#a1afc7]">
          Update your athlete profile information used for performance tracking.
        </p>

        {savedMsg && (
          <div className="kp-status-success rounded-xl p-3 text-xs my-4 font-bold">
            <span className="flex items-center gap-2"><AppIcon name="check" size={14} /> Profile settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="kp-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="kp-input"
              />
            </div>
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="kp-select"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">State / District</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="kp-input"
            />
          </div>

          <div>
            <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Primary Sport</label>
            <input
              type="text"
              value={form.primarySport}
              onChange={(e) => setForm({ ...form, primarySport: e.target.value })}
              className="kp-input"
            />
          </div>

          <div>
            <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Position / Role</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="kp-input"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="submit" className="kp-button flex-1 py-3 text-sm">
              Save Profile Changes
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="kp-button-danger px-5 py-3 text-sm font-bold"
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
