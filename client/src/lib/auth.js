const STORAGE_KEY_USER = 'sports_talent_current_athlete';
const STORAGE_KEY_ASSESSMENTS_PREFIX = 'sports_talent_assessments_';
const STORAGE_KEY_PROFILES = 'sports_talent_profiles';

export function getCurrentAthlete() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse saved athlete profile:', err);
    return null;
  }
}

export function saveAthleteProfile(profileData) {
  if (typeof window === 'undefined') return null;
  const athlete = {
    id: profileData.id || `ath_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    fullName: profileData.fullName?.trim() || 'Athlete',
    age: parseInt(profileData.age, 10) || 18,
    gender: profileData.gender || 'Male',
    location: profileData.location?.trim() || 'State/District',
    primarySport: profileData.primarySport || 'General Fitness',
    role: profileData.role || 'athlete',
    recruiterId: profileData.recruiterId?.trim() || '',
    organizationName: profileData.organizationName?.trim() || '',
    organizationType: profileData.organizationType?.trim() || '',
    position: profileData.position?.trim() || '',
    createdAt: profileData.createdAt || new Date().toISOString(),
  };
  const profiles = getAllProfiles().filter((profile) => profile.id !== athlete.id);
  profiles.push(athlete);
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(athlete));
  return athlete;
}

export function getAllProfiles() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    const profiles = raw ? JSON.parse(raw) : [];
    const currentRaw = localStorage.getItem(STORAGE_KEY_USER);
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    if (current && !profiles.some((profile) => profile.id === current.id)) {
      profiles.push(current);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    }
    return profiles;
  } catch (err) {
    console.error('Failed to load saved profiles:', err);
    return [];
  }
}

export function findProfile({ fullName, role = 'athlete', recruiterId = '' }) {
  const normalizedName = fullName?.trim().toLowerCase();
  const normalizedRecruiterId = recruiterId?.trim().toLowerCase();
  return getAllProfiles().find((profile) => (
    profile.role === role
    && profile.fullName?.toLowerCase() === normalizedName
    && (role !== 'scout' || profile.recruiterId?.toLowerCase() === normalizedRecruiterId)
  )) || null;
}

export function logoutAthlete() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_USER);
}

export function getAthleteAssessments(athleteId) {
  if (typeof window === 'undefined' || !athleteId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_ASSESSMENTS_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load assessments:', err);
    return [];
  }
}

export function saveAssessmentRecord(athleteId, assessmentResult) {
  if (typeof window === 'undefined' || !athleteId || !assessmentResult) return [];
  const history = getAthleteAssessments(athleteId);
  const record = {
    id: assessmentResult.assessment_id || `rec_${Date.now()}`,
    testType: assessmentResult.assessment_type || 'VERTICAL_JUMP',
    testName: assessmentResult.assessment_type === 'LONG_JUMP' ? 'Long Jump' : 'Vertical Jump',
    date: new Date().toISOString(),
    resultData: assessmentResult,
  };
  const updated = [record, ...history];
  localStorage.setItem(`${STORAGE_KEY_ASSESSMENTS_PREFIX}${athleteId}`, JSON.stringify(updated));
  return updated;
}
