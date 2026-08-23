import React, { useState, useEffect, useCallback } from 'react';
import CameraRecorder from '../components/CameraRecorder';
import VideoUploader from '../components/VideoUploader';
import QualityCheck from '../components/QualityCheck';
import AssessmentReport from '../components/AssessmentReport';
import AuthView from '../components/auth/AuthView';
import PreTestInstructions from '../components/assessment/PreTestInstructions';
import AthleteNavHeader from '../components/dashboard/AthleteNavHeader';
import OverviewTab from '../components/dashboard/OverviewTab';
import AthleteDNATab from '../components/dashboard/AthleteDNATab';
import ProgressHistoryTab from '../components/dashboard/ProgressHistoryTab';
import ProfileSettingsTab from '../components/dashboard/ProfileSettingsTab';
import ScoutWorkspace from '../components/dashboard/ScoutWorkspace';
import AthleteProfileTab from '../components/dashboard/AthleteProfileTab';
import AthletePerformanceTab from '../components/dashboard/AthletePerformanceTab';
import AthleteOpportunitiesTab from '../components/dashboard/AthleteOpportunitiesTab';
import Footer from '../components/layout/Footer';
import AppIcon from '../components/ui/AppIcon';

import { API_BASE, parseApiError } from '../lib/api';
import {
  getCurrentAthlete,
  saveAthleteProfile,
  logoutAthlete,
  getAthleteAssessments,
  saveAssessmentRecord,
  findProfile,
} from '../lib/auth';

export default function Home() {
  // ── Authentication State ──
  const [athlete, setAthlete] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [authLoaded, setAuthLoaded] = useState(false);

  // ── Navigation & View State ──
  // View mode: 'dashboard' | 'assessment_flow' | 'view_report'
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('overview'); // overview | assessments | performance | athlete_dna | progress | profile | opportunities | settings

  // ── Assessment Workflow State ──
  // Workflow step: 'select_test' | 'instructions' | 'input_method' | 'record' | 'upload' | 'quality_check' | 'analyzing' | 'results'
  const [assessmentStep, setAssessmentStep] = useState('select_test');
  const [selectedTest, setSelectedTest] = useState('VERTICAL_JUMP');
  const [videoSource, setVideoSource] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [qualityChecks, setQualityChecks] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [refWidthM, setRefWidthM] = useState(1.0);
  const [refHeightM, setRefHeightM] = useState(0.5);
  const [demoMode, setDemoMode] = useState(true);

  // Load authenticated athlete on mount
  useEffect(() => {
    const saved = getCurrentAthlete();
    if (saved) {
      setAthlete(saved);
      const history = getAthleteAssessments(saved.id);
      setAssessments(history);
    }
    setAuthLoaded(true);
  }, []);

  // ── Auth Actions ──
  const handleAuthenticate = (profileData) => {
    const saved = saveAthleteProfile(profileData);
    setAthlete(saved);
    const history = getAthleteAssessments(saved.id);
    setAssessments(history);
    setViewMode('dashboard');
    setActiveTab('overview');
  };

  const handleLogin = (credentials) => {
    const saved = findProfile(credentials);
    if (!saved) return null;
    setAthlete(saved);
    setAssessments(getAthleteAssessments(saved.id));
    setViewMode('dashboard');
    setActiveTab('overview');
    return saved;
  };

  const handleLogout = () => {
    logoutAthlete();
    setAthlete(null);
    setAssessments([]);
    setViewMode('dashboard');
    setActiveTab('overview');
  };

  const handleUpdateProfile = (updatedData) => {
    if (!athlete) return;
    const merged = { ...athlete, ...updatedData };
    const saved = saveAthleteProfile(merged);
    setAthlete(saved);
  };

  // ── Assessment Flow Actions ──
  const startNewAssessment = (testType = 'VERTICAL_JUMP') => {
    setSelectedTest(testType);
    setAssessmentStep('select_test');
    setVideoBlob(null);
    setQualityChecks(null);
    setAnalysisError(null);
    setCurrentReport(null);
    setViewMode('assessment_flow');
  };

  const handleSelectTest = (testType) => {
    setSelectedTest(testType);
    setAssessmentStep('instructions');
  };

  const handleProceedFromInstructions = () => {
    setAssessmentStep('input_method');
  };

  const chooseInputMethod = (method) => {
    setVideoSource(method);
    setAssessmentStep(method); // 'record' | 'upload'
  };

  // Build multipart form data for endpoints
  const buildVideoForm = (blob, source) => {
    const fd = new FormData();
    fd.append('video', blob, source === 'camera' ? 'jump.webm' : blob.name || 'jump.mp4');
    return fd;
  };

  // Execute full analysis against backend
  const runAssessment = useCallback(
    async (blob, source) => {
      setAssessmentStep('analyzing');
      setAnalysisError(null);

      const fd = buildVideoForm(blob, source);
      fd.append('full_name', athlete?.fullName || 'Athlete');
      fd.append('age', athlete?.age || 18);
      fd.append('gender', athlete?.gender || 'Male');
      fd.append('state_district', athlete?.location || 'District');
      const isLongJump = selectedTest === 'LONG_JUMP';
      fd.append('test_type', isLongJump ? 'LONG_JUMP' : 'VERTICAL_JUMP');
      if (isLongJump) {
        fd.append('ref_width_m', String(refWidthM));
        fd.append('ref_height_m', String(refHeightM));
        fd.append('demo_mode', demoMode ? 'true' : 'false');
      }

      try {
        const endpoint = isLongJump ? `${API_BASE}/assess/long-jump` : `${API_BASE}/assess`;
        const res = await fetch(endpoint, { method: 'POST', body: fd });

        if (res.status === 422) {
          const errData = await res.json();
          const parsed = parseApiError(errData, 'Video quality is insufficient for reliable measurement.');
          setQualityChecks(
            parsed.qualityChecks || {
              person_detected: false,
              full_body_visible: false,
              feet_visible: false,
              enough_frames: false,
              movement_detected: false,
            }
          );
          setAnalysisError(parsed.message);
          setAssessmentStep('quality_check');
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Server processing error.' }));
          const parsed = parseApiError(errData, `HTTP ${res.status}`);
          throw new Error(parsed.message);
        }

        const data = await res.json();
        setCurrentReport(data);

        // Persist assessment result against athlete
        if (athlete?.id) {
          const updatedHistory = saveAssessmentRecord(athlete.id, data);
          setAssessments(updatedHistory);
        }

        setAssessmentStep('results');
      } catch (err) {
        setAnalysisError(`Analysis failed: ${err.message}. Check that the backend server is running.`);
        setAssessmentStep('analyzing');
      }
    },
    [athlete, selectedTest, refWidthM, refHeightM, demoMode]
  );

  // Quality check step execution
  const handleVideoReady = useCallback(
    async (blob, source) => {
      setVideoBlob(blob);
      setVideoSource(source);
      setQualityChecks(null);
      setAnalysisError(null);
      setCurrentReport(null);
      setAssessmentStep('quality_check');

      try {
        const res = await fetch(`${API_BASE}/quality-check`, {
          method: 'POST',
          body: buildVideoForm(blob, source),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 422) {
          const parsed = parseApiError(data, 'We couldn’t clearly detect your full body. Move farther from the camera and make sure your head and feet remain visible.');
          setQualityChecks(
            parsed.qualityChecks || {
              person_detected: false,
              full_body_visible: false,
              feet_visible: false,
              enough_frames: false,
              movement_detected: false,
            }
          );
          setAnalysisError(parsed.message);
          return;
        }

        if (!res.ok) {
          const parsed = parseApiError(data, `Quality check failed (HTTP ${res.status}).`);
          throw new Error(parsed.message);
        }

        setQualityChecks(data.quality_checks);
      } catch (err) {
        setAnalysisError(`Quality check failed: ${err.message}. Ensure backend is running.`);
      }
    },
    []
  );

  const onQualityPass = () => {
    if (videoBlob) {
      runAssessment(videoBlob, videoSource);
    }
  };

  const onQualityFail = () => {
    setAssessmentStep('input_method');
    setQualityChecks(null);
    setAnalysisError(null);
  };

  const handleViewPastReport = (reportData) => {
    setCurrentReport(reportData);
    setViewMode('view_report');
  };

  const returnToDashboard = () => {
    setViewMode('dashboard');
    setActiveTab('overview');
  };

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#06121a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#74c9ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#a1afc7]">Loading AthleteX…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Unauthenticated State (Signup / Login)
  // ─────────────────────────────────────────────
  if (!athlete) {
    return (
      <div className="kp-shell">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0f1c2d] border border-[#d4ff4d]/30 text-[#d4ff4d] rounded-full text-xs font-bold mb-4">
              <><AppIcon name="spark" size={14} /><span>AthleteX Scout Portal</span></>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">
              Biomechanical Identification & Assessment
            </h1>
            <p className="text-sm text-[#a1afc7]">
              Create an athlete profile to access computer-vision performance analysis and explainable reports.
            </p>
          </div>

          <AuthView onAuthenticate={handleAuthenticate} onLogin={handleLogin} />
        </div>
        <Footer />
      </div>
    );
  }

  if (athlete.role === 'scout') {
    return <ScoutWorkspace scout={athlete} onLogout={handleLogout} />;
  }

  // ─────────────────────────────────────────────
  // Authenticated Application Architecture
  // ─────────────────────────────────────────────
  return (
    <div className="kp-shell min-h-screen flex flex-col justify-between">
      <div>
        <AthleteNavHeader
          activeTab={activeTab}
          onSelectTab={(tabId) => {
            setViewMode('dashboard');
            setActiveTab(tabId);
          }}
          athlete={athlete}
          onLogout={handleLogout}
          onStartAssessment={() => startNewAssessment('VERTICAL_JUMP')}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* VIEW: Viewing Past Report */}
          {viewMode === 'view_report' && currentReport && (
            <div className="space-y-4">
              <button
                onClick={returnToDashboard}
                className="text-xs text-[#74c9ff] hover:underline flex items-center gap-1 font-bold"
              >
                ← Return to Athlete Dashboard
              </button>
              <AssessmentReport
                data={currentReport}
                onReset={returnToDashboard}
                isDemo={false}
              />
            </div>
          )}

          {/* VIEW: Active Assessment Workflow */}
          {viewMode === 'assessment_flow' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <button
                onClick={returnToDashboard}
                className="text-xs text-[#a1afc7] hover:text-white transition flex items-center gap-1 mb-2"
              >
                <><AppIcon name="x" size={14} /> Cancel & Return to Dashboard</>
              </button>

              {/* Step 1: Select Test */}
              {assessmentStep === 'select_test' && (
                <div className="kp-card p-6">
                  <div className="kp-kicker">New Assessment</div>
                  <h2 className="text-2xl font-black text-white mb-2">Select Athletic Test</h2>
                  <p className="text-sm text-[#a1afc7] mb-6">
                    Select a computer-vision powered movement test to baseline your performance.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleSelectTest('VERTICAL_JUMP')}
                      className="w-full text-left kp-card-soft p-5 transition hover:border-[#d4ff4d] border-2 border-transparent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white text-lg flex items-center gap-2">
                            <span>⬆️</span> Vertical Jump
                          </p>
                          <p className="text-sm text-[#a1afc7] mt-1">
                            Measures explosive lower-body performance and flight time using smartphone video.
                          </p>
                        </div>
                        <span className="kp-pill active">Available</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSelectTest('LONG_JUMP')}
                      className="w-full text-left kp-card-soft p-5 transition hover:border-[#74c9ff] border-2 border-transparent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white text-lg flex items-center gap-2">
                            <><AppIcon name="run" size={18} /> Long Jump</>
                          </p>
                          <p className="text-sm text-[#a1afc7] mt-1">
                            Measures run-up velocity, takeoff quality, landing angle, and horizontal jump distance.
                          </p>
                        </div>
                        <span className="kp-pill active">Available</span>
                      </div>
                    </button>

                    <div className="w-full text-left kp-card-soft p-5 opacity-55">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#a1afc7] text-lg flex items-center gap-2">
                            <><AppIcon name="spark" size={18} /> Sprint Speed (10m / 30m)</>
                          </p>
                          <p className="text-sm text-[#7a8aa7] mt-1">
                            Calculates top speed, acceleration curve, and stride frequency.
                          </p>
                        </div>
                        <span className="kp-pill">Coming Soon</span>
                      </div>
                    </div>

                    <div className="w-full text-left kp-card-soft p-5 opacity-55">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#a1afc7] text-lg flex items-center gap-2">
                            <span>↔️</span> Pro Shuttle Run
                          </p>
                          <p className="text-sm text-[#7a8aa7] mt-1">
                            Measures change-of-direction acceleration, braking power, and agility.
                          </p>
                        </div>
                        <span className="kp-pill">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Protocol Instructions */}
              {assessmentStep === 'instructions' && (
                (
                  <PreTestInstructions
                    testType={selectedTest}
                    refWidthM={refWidthM}
                    setRefWidthM={setRefWidthM}
                    refHeightM={refHeightM}
                    setRefHeightM={setRefHeightM}
                    demoMode={demoMode}
                    setDemoMode={setDemoMode}
                    onProceed={handleProceedFromInstructions}
                    onBack={() => setAssessmentStep('select_test')}
                  />
                )
              )}

              {/* Step 3: Choose Input Method */}
              {assessmentStep === 'input_method' && (
                <div className="kp-card p-6">
                  <button
                    onClick={() => setAssessmentStep('instructions')}
                    className="text-xs text-[#a1afc7] mb-4 hover:text-white"
                  >
                    ← Back to Protocol Instructions
                  </button>
                  <div className="kp-kicker">Video Input</div>
                  <h2 className="text-xl font-black text-white mb-2">Select Video Submission Method</h2>
                  <p className="text-sm text-[#a1afc7] mb-6">
                    For optimal pose detection, submit a 3-second video keeping your full body visible.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => chooseInputMethod('record')}
                      className="kp-card-soft p-6 text-center hover:border-[#74c9ff] transition cursor-pointer"
                    >
                      <div className="mb-3"><AppIcon name="video" size={34} className="mx-auto text-[#74c9ff]" /></div>
                      <p className="font-bold text-white text-base">Record Live Video</p>
                      <p className="text-xs text-[#a1afc7] mt-1">Use device camera in real-time</p>
                    </button>

                    <button
                      onClick={() => chooseInputMethod('upload')}
                      className="kp-card-soft p-6 text-center hover:border-[#74c9ff] transition cursor-pointer"
                    >
                      <div className="mb-3"><AppIcon name="upload" size={34} className="mx-auto text-[#74c9ff]" /></div>
                      <p className="font-bold text-white text-base">Upload Pre-recorded Video</p>
                      <p className="text-xs text-[#a1afc7] mt-1">MP4 · MOV · WebM (Max 5s)</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4A: Record */}
              {assessmentStep === 'record' && (
                <div className="kp-card p-6">
                  <div className="kp-kicker">Camera Session</div>
                  <h2 className="text-xl font-black text-white mb-4">Record Assessment Video</h2>
                  <CameraRecorder
                    onVideoReady={handleVideoReady}
                    onBack={() => setAssessmentStep('input_method')}
                  />
                </div>
              )}

              {/* Step 4B: Upload */}
              {assessmentStep === 'upload' && (
                <div className="kp-card p-6">
                  <div className="kp-kicker">Video File</div>
                  <h2 className="text-xl font-black text-white mb-4">Upload Assessment Video</h2>
                  <VideoUploader
                    onVideoReady={(file) => handleVideoReady(file, 'upload')}
                    onBack={() => setAssessmentStep('input_method')}
                  />
                </div>
              )}

              {/* Step 5: Quality Check */}
              {assessmentStep === 'quality_check' && (
                <div className="kp-card p-6">
                  <div className="kp-kicker">Pre-Analysis Validation</div>
                  <h2 className="text-xl font-black text-white mb-4">Video Quality Check</h2>

                  {!qualityChecks && !analysisError && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-[#1d2a3d]" />
                        <div className="w-16 h-16 rounded-full border-4 border-[#d4ff4d] border-t-transparent animate-spin absolute inset-0" />
                      </div>
                      <p className="text-[#a1afc7] text-sm">Evaluating person detection, framing, and full-body visibility…</p>
                    </div>
                  )}

                  {analysisError && !qualityChecks && (
                    <div className="space-y-4">
                      <div className="kp-status-danger rounded-xl p-4 text-sm">
                        <p className="font-bold mb-1 flex items-center gap-2"><AppIcon name="warning" size={16} /> Video Quality Check Failed</p>
                        <p className="text-xs text-red-200 mt-1">{analysisError}</p>
                      </div>
                      <button
                        onClick={onQualityFail}
                        className="kp-button w-full py-3 text-sm font-bold"
                      >
                        <><AppIcon name="refresh" size={15} /> TRY AGAIN (Record / Upload New Video)</>
                      </button>
                    </div>
                  )}

                  {qualityChecks && (
                    <QualityCheck
                      qualityChecks={qualityChecks}
                      onPass={onQualityPass}
                      onFail={onQualityFail}
                      extraChecks={
                        selectedTest === 'LONG_JUMP'
                          ? [{ key: 'calibration_valid', label: 'Ground plane calibrated' }]
                          : []
                      }
                      isLongJump={selectedTest === 'LONG_JUMP'}
                      errorMessage={analysisError}
                    />
                  )}
                </div>
              )}

              {/* Step 6: AI Analysis Progress */}
              {assessmentStep === 'analyzing' && (
                <div className="kp-card p-6">
                  <div className="kp-kicker">Computer Vision Pipeline</div>
                  <h2 className="text-xl font-black text-white mb-4">Analyzing Biomechanics & Movement</h2>

                  <div className="flex flex-col items-center gap-5 py-8">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-[#1d2a3d]" />
                      <div className="w-20 h-20 rounded-full border-4 border-[#74c9ff] border-t-transparent animate-spin absolute inset-0" />
                    </div>

                    <div className="text-center space-y-2 max-w-sm">
                      <p className="text-white font-bold text-base">
                        {selectedTest === 'LONG_JUMP'
                          ? 'Running Long Jump Calibration Pipeline'
                          : 'Running Pose Estimation Pipeline'}
                      </p>
                      <div className="space-y-1 text-xs text-[#a1afc7]">
                        {selectedTest === 'LONG_JUMP' ? (
                          <>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-[#d4ff4d]"><AppIcon name="check" size={15} /></span> Detecting reference object corners
                            </p>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-[#74c9ff]"><AppIcon name="check" size={15} /></span> Building ground-plane homography
                            </p>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-purple-400"><AppIcon name="check" size={15} /></span> Mapping takeoff/landing to meters
                            </p>
                            <p className="flex items-center justify-center gap-2 text-[#7a8aa7]">
                              ⏳ Scoring confidence and uncertainty…
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-[#d4ff4d]"><AppIcon name="check" size={15} /></span> Detecting body landmarks frame-by-frame
                            </p>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-[#74c9ff]"><AppIcon name="check" size={15} /></span> Identifying exact takeoff & landing frames
                            </p>
                            <p className="flex items-center justify-center gap-2">
                              <span className="text-purple-400"><AppIcon name="check" size={15} /></span> Calculating physics parameters (h = g·t²/8)
                            </p>
                            <p className="flex items-center justify-center gap-2 text-[#7a8aa7]">
                              ⏳ Generating AI coach evaluation report…
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {analysisError && (
                    <div className="space-y-4">
                      <div className="kp-status-danger rounded-xl p-4 text-sm">
                        <p className="font-bold mb-1 flex items-center gap-2"><AppIcon name="warning" size={16} /> Analysis Processing Error</p>
                        <p className="text-xs text-red-200 mt-1">{analysisError}</p>
                      </div>
                      <button
                        onClick={onQualityFail}
                        className="kp-button w-full py-3 text-sm font-bold"
                      >
                        <><AppIcon name="refresh" size={15} /> TRY AGAIN</>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 7: Results & Persistence */}
              {assessmentStep === 'results' && currentReport && (
                <div className="space-y-4">
                  <div className="kp-status-success rounded-xl p-4 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2"><AppIcon name="check" size={16} /> Assessment Analysis Completed & Saved to your Profile History!</span>
                    <button
                      onClick={returnToDashboard}
                      className="underline text-white hover:text-[#d4ff4d]"
                    >
                      Return to Dashboard →
                    </button>
                  </div>

                  <AssessmentReport
                    data={currentReport}
                    onReset={() => startNewAssessment('VERTICAL_JUMP')}
                    isDemo={selectedTest === 'LONG_JUMP' && demoMode}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW: Main Authenticated Dashboard */}
          {viewMode === 'dashboard' && (
            <div>
              {activeTab === 'overview' && (
                <OverviewTab
                  athlete={athlete}
                  assessments={assessments}
                  onStartAssessment={() => startNewAssessment('VERTICAL_JUMP')}
                  onViewReport={handleViewPastReport}
                />
              )}

              {activeTab === 'assessments' && (
                <div className="space-y-6">
                  <div className="kp-card p-6 flex justify-between items-center">
                    <div>
                      <div className="kp-kicker">Available Tests</div>
                      <h2 className="text-2xl font-black text-white">Athletic Assessments Catalog</h2>
                    </div>
                    <button
                      onClick={() => startNewAssessment('VERTICAL_JUMP')}
                      className="kp-button py-2.5 px-4 text-xs font-bold"
                    >
                      + Start Vertical Jump
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => startNewAssessment('VERTICAL_JUMP')}
                      className="kp-card p-6 cursor-pointer hover:border-[#d4ff4d] transition group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-3xl">⬆️</span>
                        <span className="kp-pill active">Available</span>
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#d4ff4d] transition">
                        Vertical Jump Assessment
                      </h3>
                      <p className="text-xs text-[#a1afc7] mt-2 leading-relaxed">
                        Measures lower-body explosive power, flight time, takeoff velocity, and movement quality using computer vision physics.
                      </p>
                      <div className="mt-4 pt-3 border-t border-[#1d2a3d] flex justify-between items-center text-xs text-[#74c9ff]">
                        <span>Protocol: 3-second camera trial</span>
                        <span>Start Test →</span>
                      </div>
                    </div>

                    <div
                      onClick={() => startNewAssessment('LONG_JUMP')}
                      className="kp-card p-6 cursor-pointer hover:border-[#74c9ff] transition group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <AppIcon name="run" size={28} />
                        <span className="kp-pill active">Available</span>
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#74c9ff] transition">
                        Long Jump Assessment
                      </h3>
                      <p className="text-xs text-[#a1afc7] mt-2 leading-relaxed">
                        Measures horizontal jump distance, approach speed, takeoff quality, and landing mechanics.
                      </p>
                      <div className="mt-4 pt-3 border-t border-[#1d2a3d] flex justify-between items-center text-xs text-[#74c9ff]">
                        <span>Protocol: Video recording or upload</span>
                        <span>Start Test →</span>
                      </div>
                    </div>

                    <div className="kp-card p-6 opacity-55">
                      <div className="flex justify-between items-start mb-3">
                        <AppIcon name="spark" size={28} />
                        <span className="kp-pill">Coming Soon</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#a1afc7]">Sprint Speed (10m / 30m)</h3>
                      <p className="text-xs text-[#7a8aa7] mt-2 leading-relaxed">
                        Measures acceleration, top stride speed, and velocity breakdown.
                      </p>
                    </div>

                    <div className="kp-card p-6 opacity-55">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-3xl">↔️</span>
                        <span className="kp-pill">Coming Soon</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#a1afc7]">Pro Shuttle Run</h3>
                      <p className="text-xs text-[#7a8aa7] mt-2 leading-relaxed">
                        Evaluates lateral agility, deceleration mechanics, and direction change speed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <AthletePerformanceTab assessments={assessments} />
              )}

              {activeTab === 'opportunities' && <AthleteOpportunitiesTab />}

              {activeTab === 'profile' && (
                <AthleteProfileTab athlete={athlete} onUpdateProfile={handleUpdateProfile} />
              )}

              {activeTab === 'athlete_dna' && (
                <AthleteDNATab
                  athlete={athlete}
                  assessments={assessments}
                  onStartAssessment={() => startNewAssessment('VERTICAL_JUMP')}
                />
              )}

              {activeTab === 'progress' && (
                <ProgressHistoryTab
                  assessments={assessments}
                  onStartAssessment={() => startNewAssessment('VERTICAL_JUMP')}
                  onViewReport={handleViewPastReport}
                />
              )}

              {activeTab === 'settings' && (
                <ProfileSettingsTab
                  athlete={athlete}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={handleLogout}
                />
              )}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}