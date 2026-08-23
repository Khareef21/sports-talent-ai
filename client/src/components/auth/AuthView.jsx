import React, { useState } from 'react';

const PRIMARY_SPORTS_OPTIONS = [
  'Vertical Jump',
  'Long Jump',
  'Others',
];

export default function AuthView({ onAuthenticate, onLogin }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [form, setForm] = useState({
    fullName: '',
    age: '',
    gender: 'Male',
    location: '',
    primarySport: 'Vertical Jump',
    role: 'athlete',
    recruiterId: '',
    organizationName: '',
    organizationType: 'Scouting organization',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (form.role === 'athlete') {
      const ageNum = parseInt(form.age, 10);
      if (!form.age || isNaN(ageNum) || ageNum < 5 || ageNum > 80) {
        newErrors.age = 'Enter a valid age (5–80).';
      }
    }
    if (!form.location.trim()) newErrors.location = 'State/District is required.';
    if (form.role === 'scout' && !form.recruiterId.trim()) newErrors.recruiterId = 'Recruiter ID is required.';
    if (form.role === 'scout' && !form.organizationName.trim()) newErrors.organizationName = 'Organization name is required.';
    if (form.role === 'athlete' && !form.primarySport) newErrors.primarySport = 'Primary sport is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAuthenticate({
      ...form,
      position: '', // position removed per instructions
    });
  };

  const handleQuickLogin = (e) => {
    e.preventDefault();
    if (form.role === 'scout' && !form.recruiterId.trim()) {
      setErrors({ recruiterId: 'Recruiter ID is required to log in.' });
      return;
    }
    if (!form.fullName.trim()) {
      setErrors({ fullName: 'Enter your registered name to log in.' });
      return;
    }
    const profile = onLogin?.({
      fullName: form.fullName.trim(),
      role: form.role,
      recruiterId: form.recruiterId.trim(),
    });
    if (!profile) {
      setErrors({ fullName: 'No matching saved profile was found.' });
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="kp-card p-6">
        <div className="flex items-center justify-between mb-6 border-b border-[#1d2a3d] pb-4">
          <div>
            <div className="kp-kicker">Authenticated Portal</div>
            <h2 className="text-2xl font-black text-white">
              {mode === 'signup' ? 'Create Your Portal Profile' : 'Athlete Sign In'}
            </h2>
          </div>
          <div className="flex bg-[#0b1220] p-1 rounded-lg border border-[#1d2a3d]">
            <button
              onClick={() => setMode('signup')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                mode === 'signup' ? 'bg-[#74c9ff] text-[#06121a]' : 'text-[#a1afc7]'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('login')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                mode === 'login' ? 'bg-[#74c9ff] text-[#06121a]' : 'text-[#a1afc7]'
              }`}
            >
              Log In
            </button>
          </div>
        </div>

        {mode === 'signup' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Portal Type *</label>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} className="kp-select">
                <option value="athlete">Athlete</option>
                <option value="scout">Scouting Team</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="kp-input"
              />
              {errors.fullName && <p className="text-xs text-[#ffb4c1] mt-1">{errors.fullName}</p>}
            </div>

            {form.role === 'athlete' && <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Age *</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  placeholder="e.g. 18"
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  className="kp-input"
                />
                {errors.age && <p className="text-xs text-[#ffb4c1] mt-1">{errors.age}</p>}
              </div>

              <div>
                <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Gender *</label>
                <select
                  value={form.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="kp-select"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>}

            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">State / District *</label>
              <input
                type="text"
                placeholder="e.g. Bangalore, Karnataka"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="kp-input"
              />
              {errors.location && <p className="text-xs text-[#ffb4c1] mt-1">{errors.location}</p>}
            </div>

            {form.role === 'scout' && <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Recruiter ID *</label>
              <input
                type="text"
                placeholder="e.g. REC-1024"
                value={form.recruiterId}
                onChange={(e) => handleChange('recruiterId', e.target.value)}
                className="kp-input"
              />
              {errors.recruiterId && <p className="text-xs text-[#ffb4c1] mt-1">{errors.recruiterId}</p>}
            </div>}

            {form.role === 'scout' && <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Organization Name *</label>
              <input
                type="text"
                placeholder="e.g. Horizon Talent Group"
                value={form.organizationName}
                onChange={(e) => handleChange('organizationName', e.target.value)}
                className="kp-input"
              />
              {errors.organizationName && <p className="text-xs text-[#ffb4c1] mt-1">{errors.organizationName}</p>}
            </div>}

            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Primary Sport *</label>
              <select
                value={form.primarySport}
                onChange={(e) => handleChange('primarySport', e.target.value)}
                className="kp-select"
              >
                {PRIMARY_SPORTS_OPTIONS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="kp-button w-full mt-2 py-3 text-base">
              Create Profile
            </button>
          </form>
        ) : (
          <form onSubmit={handleQuickLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Portal Type</label>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} className="kp-select">
                <option value="athlete">Athlete</option>
                <option value="scout">Scouting Team</option>
              </select>
            </div>
            <p className="text-xs text-[#a1afc7] mb-2">
              {form.role === 'scout'
                ? 'Use your recruiter credentials to access the scouting workspace.'
                : 'Enter your registered name to access your athlete dashboard and past performance records.'}
            </p>
            <div>
              <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">
                {form.role === 'scout' ? 'Recruiter Name' : 'Athlete Name'}
              </label>
              <input
                type="text"
                placeholder="Enter your registered name"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="kp-input"
              />
              {errors.fullName && <p className="text-xs text-[#ffb4c1] mt-1">{errors.fullName}</p>}
            </div>

            {form.role === 'scout' && (
              <div>
                <label className="text-xs text-[#a1afc7] font-semibold mb-1 block">Recruiter ID</label>
                <input
                  type="text"
                  placeholder="e.g. REC-1024"
                  value={form.recruiterId}
                  onChange={(e) => handleChange('recruiterId', e.target.value)}
                  className="kp-input"
                />
                {errors.recruiterId && <p className="text-xs text-[#ffb4c1] mt-1">{errors.recruiterId}</p>}
              </div>
            )}

            <button type="submit" className="kp-button w-full py-3 text-base">
              {form.role === 'scout' ? 'Log In to Scout Workspace →' : 'Log In to Dashboard →'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs text-[#74c9ff] hover:underline"
              >
                Don't have an account? Create one now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
