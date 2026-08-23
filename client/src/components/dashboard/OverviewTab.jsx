import React from 'react';
import AppIcon from '../ui/AppIcon';

export default function OverviewTab({ athlete, assessments = [], onStartAssessment, onViewReport }) {
  const hasAssessments = assessments.length > 0;

  // Calculate real aggregated scores from assessments array if available
  const latestVerticalJump = assessments.find((a) => a.testType === 'VERTICAL_JUMP');
  const latestLongJump = assessments.find((a) => a.testType === 'LONG_JUMP');

  const jumpHeight = latestVerticalJump?.resultData?.metrics?.jump_height_cm;

  // Overall Score calculation (if assessments exist)
  let overallScoreStr = '--';
  if (hasAssessments) {
    if (latestVerticalJump?.resultData?.metrics?.measurement_confidence !== undefined) {
      overallScoreStr = `${Math.round(latestVerticalJump.resultData.metrics.measurement_confidence)}/100`;
    } else if (latestLongJump?.resultData?.metrics?.technique_score) {
      overallScoreStr = `${Math.round(latestLongJump.resultData.metrics.technique_score)}/100`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Athlete Banner */}
      <div className="kp-card kp-card-hoverable p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#d4ff4d]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="kp-pill active">{athlete.primarySport || 'Athlete'}</span>
            {athlete.position && <span className="kp-pill">{athlete.position}</span>}
          </div>
          <h2 className="text-3xl font-black text-white">{athlete.fullName}</h2>
          <p className="text-xs text-[#a1afc7] mt-1">
            {athlete.age} yrs • {athlete.gender} • {athlete.location}
          </p>
        </div>

        <button onClick={onStartAssessment} className="kp-button kp-button-cta py-3 px-6 text-sm shrink-0 flex items-center gap-2">
          <AppIcon name="spark" size={16} /> Start New Assessment
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kp-card kp-card-hoverable p-4">
          <div className="text-xs text-[#a1afc7] font-semibold uppercase tracking-wider mb-1">
            Overall Athletic Score
          </div>
          <div className="text-3xl font-black text-white">{overallScoreStr}</div>
          <p className="text-xs text-[#7a8aa7] mt-1">
            {hasAssessments ? `Based on ${assessments.length} verified trial(s)` : 'No assessments completed'}
          </p>
        </div>

        <div className="kp-card kp-card-hoverable p-4">
          <div className="text-xs text-[#a1afc7] font-semibold uppercase tracking-wider mb-1">
            Explosiveness (Jump)
          </div>
          <div className="text-3xl font-black text-[#d4ff4d]">
            {jumpHeight !== undefined ? `${jumpHeight} cm` : '--'}
          </div>
          <p className="text-xs text-[#7a8aa7] mt-1">
            {'Vertical Jump metric'}
          </p>
        </div>

        <div className="kp-card kp-card-hoverable p-4">
          <div className="text-xs text-[#a1afc7] font-semibold uppercase tracking-wider mb-1">
            Agility / Speed
          </div>
          <div className="text-3xl font-black text-[#74c9ff]">--</div>
          <p className="text-xs text-[#7a8aa7] mt-1">Sprint & Shuttle run pending</p>
        </div>

        <div className="kp-card kp-card-hoverable p-4">
          <div className="text-xs text-[#a1afc7] font-semibold uppercase tracking-wider mb-1">
            Completed Assessments
          </div>
          <div className="text-3xl font-black text-white">{assessments.length}</div>
          <p className="text-[#7a8aa7] text-xs mt-1">Verified trial records</p>
        </div>
      </div>

      {/* Recent Assessments Section */}
      <div className="kp-card kp-card-hoverable p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="kp-kicker">Assessment Log</div>
            <h3 className="text-xl font-black text-white">Recent Assessments</h3>
          </div>
          {hasAssessments && (
            <span className="text-xs text-[#a1afc7] font-semibold">
              {assessments.length} Total Record(s)
            </span>
          )}
        </div>

        {!hasAssessments ? (
          <div className="kp-card-soft p-8 text-center my-2">
            <div className="mb-3"><AppIcon name="chart" size={34} className="mx-auto text-[#74c9ff]" /></div>
            <h4 className="text-lg font-bold text-white mb-1">No assessments yet</h4>
            <p className="text-sm text-[#a1afc7] max-w-md mx-auto mb-4">
              You haven't recorded any athletic trials yet. Start your first vertical jump assessment to baseline your performance metrics!
            </p>
            <button onClick={onStartAssessment} className="kp-button py-2.5 px-5 text-xs">
              Take Your First Assessment →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.slice(0, 5).map((record) => {
              const res = record.resultData;
              const isLong = record.testType === 'LONG_JUMP';
              const metricStr = isLong
                ? `${res?.metrics?.jump_distance_m || '--'} m`
                : `${res?.metrics?.jump_height_cm || '--'} cm`;
              const tierStr = isLong ? 'Long Jump Trial' : 'Verified Trial';
              const formattedDate = new Date(record.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={record.id}
                  className="kp-card-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#74c9ff] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0f1c2d] border border-[#1d2a3d] flex items-center justify-center shrink-0 text-[#74c9ff]">
                      <AppIcon name={isLong ? 'run' : 'trend'} size={19} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{record.testName}</p>
                      <p className="text-xs text-[#a1afc7]">Recorded on {formattedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#d4ff4d]">{metricStr}</p>
                      <span className="kp-pill">{tierStr}</span>
                    </div>

                    <button
                      onClick={() => onViewReport(res)}
                      className="kp-button-ghost py-1.5 px-3 text-xs"
                    >
                      View Report →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
