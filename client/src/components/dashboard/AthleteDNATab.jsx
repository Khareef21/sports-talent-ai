import AppIcon from '../ui/AppIcon';
import React from 'react';

export default function AthleteDNATab({ athlete, assessments = [], onStartAssessment }) {
  const hasAssessments = assessments.length > 0;

  const verticalAssessment = assessments.find((a) => a.testType === 'VERTICAL_JUMP');
  const longJumpAssessment = assessments.find((a) => a.testType === 'LONG_JUMP');

  // Derived ratings based strictly on recorded metrics (or null if not available)
  const jumpHeight = verticalAssessment?.resultData?.metrics?.jump_height_cm;
  const hangTime = verticalAssessment?.resultData?.metrics?.hang_time_sec;
  const confidence = verticalAssessment?.resultData?.metrics?.measurement_confidence;

  const longDistance = longJumpAssessment?.resultData?.metrics?.jump_distance_m;
  const techniqueScore = longJumpAssessment?.resultData?.metrics?.technique_score;

  // Compute derived attributes only if real data exists
  const explosivenessRating = jumpHeight ? Math.min(99, Math.round(jumpHeight * 1.8)) : null;
  const powerRating = hangTime ? Math.min(99, Math.round((hangTime / 0.7) * 100)) : null;
  const techniqueRating = techniqueScore ? Math.round(techniqueScore) : (confidence ? Math.round(confidence) : null);
  const horizontalPowerRating = longDistance ? Math.min(99, Math.round((longDistance / 7.0) * 100)) : null;

  return (
    <div className="space-y-6">
      <div className="kp-card kp-card-hoverable p-6">
        <div className="kp-kicker">Biomechanical DNA</div>
        <h2 className="text-2xl font-black text-white mb-2">Athlete DNA Profile</h2>
        <p className="text-sm text-[#a1afc7]">
          Comprehensive athletic capability breakdown derived strictly from validated computer vision and physics assessments.
        </p>
      </div>

      {!hasAssessments ? (
        <div className="kp-card kp-card-hoverable p-12 text-center">
          <div className="mb-4"><AppIcon name="dna" size={44} className="mx-auto text-[#74c9ff]" /></div>
          <h3 className="text-xl font-bold text-white mb-2">Complete your first assessment to build your Athlete DNA</h3>
          <p className="text-sm text-[#a1afc7] max-w-md mx-auto mb-6">
            Your Athlete DNA is built dynamically from your verified movement physics, flight times, and technique scores. Record a vertical jump to start generating your profile!
          </p>
          <button onClick={onStartAssessment} className="kp-button py-3 px-6 text-sm">
            Start Vertical Jump Assessment →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attributes breakdown */}
          <div className="kp-card kp-card-hoverable p-6 space-y-5">
            <h3 className="text-lg font-bold text-white mb-4">Physical Attributes</h3>

            {/* Explosiveness */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white font-semibold">Lower-Body Explosiveness</span>
                <span className="kp-mono text-[#d4ff4d]">
                  {explosivenessRating !== null ? `${explosivenessRating}/100` : '--'}
                </span>
              </div>
              <div className="w-full bg-[#0b1220] rounded-full h-3 overflow-hidden border border-[#1d2a3d]">
                <div
                  className="h-full bg-gradient-to-r from-[#d4ff4d] to-[#7df9ff] transition-all duration-500"
                  style={{ width: `${explosivenessRating ?? 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#7a8aa7] mt-1">
                {jumpHeight ? `Derived from ${jumpHeight} cm vertical jump` : 'Vertical jump assessment required'}
              </p>
            </div>

            {/* Hang Time & Aerial Power */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white font-semibold">Aerial Hang Time & Impulse</span>
                <span className="kp-mono text-[#74c9ff]">
                  {powerRating !== null ? `${powerRating}/100` : '--'}
                </span>
              </div>
              <div className="w-full bg-[#0b1220] rounded-full h-3 overflow-hidden border border-[#1d2a3d]">
                <div
                  className="h-full bg-[#74c9ff] transition-all duration-500"
                  style={{ width: `${powerRating ?? 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#7a8aa7] mt-1">
                {hangTime ? `Based on ${hangTime} sec flight time airborne phase` : 'Pending jump trial'}
              </p>
            </div>

            {/* Technique & Control */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white font-semibold">Movement Control & Technique</span>
                <span className="kp-mono text-purple-400">
                  {techniqueRating !== null ? `${techniqueRating}/100` : '--'}
                </span>
              </div>
              <div className="w-full bg-[#0b1220] rounded-full h-3 overflow-hidden border border-[#1d2a3d]">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${techniqueRating ?? 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#7a8aa7] mt-1">
                {confidence ? `Pose tracking confidence ${confidence}%` : 'Pending trial'}
              </p>
            </div>

            {/* Horizontal Momentum */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white font-semibold">Horizontal Momentum (Long Jump)</span>
                <span className="kp-mono text-yellow-400">
                  {horizontalPowerRating !== null ? `${horizontalPowerRating}/100` : '--'}
                </span>
              </div>
              <div className="w-full bg-[#0b1220] rounded-full h-3 overflow-hidden border border-[#1d2a3d]">
                <div
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${horizontalPowerRating ?? 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#7a8aa7] mt-1">
                {longDistance ? `Based on ${longDistance} m long jump distance` : 'Long jump trial pending'}
              </p>
            </div>
          </div>

          {/* Scout Intelligence Summary */}
          <div className="kp-card kp-card-hoverable p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Scout Analysis & Fit</h3>
              <div className="space-y-4">
                <div className="kp-card-soft p-4">
                  <p className="text-xs text-[#a1afc7] font-semibold uppercase">Athlete Profile</p>
                  <p className="text-xl font-black text-white mt-1">{athlete.fullName}</p>
                  <p className="text-xs text-[#7a8aa7]">
                    {athlete.primarySport} {athlete.position ? `(${athlete.position})` : ''}
                  </p>
                </div>

                <div className="kp-card-soft p-4">
                  <p className="text-xs text-[#a1afc7] font-semibold uppercase">Sport Fit Alignment</p>
                  <p className="text-sm text-white mt-1">
                    Recommended for sports requiring explosive lower-body power: Basketball, Volleyball, Track & Field, Football.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={onStartAssessment} className="kp-button py-3 mt-6 text-sm">
              + Perform Additional Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
