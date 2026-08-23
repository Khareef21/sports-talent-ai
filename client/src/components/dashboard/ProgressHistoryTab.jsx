import React from 'react';
import AppIcon from '../ui/AppIcon';

export default function ProgressHistoryTab({ assessments = [], onStartAssessment, onViewReport }) {
  const hasAssessments = assessments.length > 0;

  return (
    <div className="space-y-6">
      <div className="kp-card kp-card-hoverable p-6">
        <div className="kp-kicker">Performance Timeline</div>
        <h2 className="text-2xl font-black text-white mb-2">Assessment History</h2>
        <p className="text-sm text-[#a1afc7]">
          Chronological record of all verified athletic trials and reports.
        </p>
      </div>

      {!hasAssessments ? (
        <div className="kp-card kp-card-hoverable p-12 text-center">
          <div className="mb-4"><AppIcon name="report" size={42} className="mx-auto text-[#74c9ff]" /></div>
          <h3 className="text-xl font-bold text-white mb-2">No history recorded yet</h3>
          <p className="text-sm text-[#a1afc7] max-w-md mx-auto mb-6">
            Every vertical jump or athletic test you complete will be permanently saved to your history ledger here.
          </p>
          <button onClick={onStartAssessment} className="kp-button py-3 px-6 text-sm">
            Record Your First Assessment →
          </button>
        </div>
      ) : (
        <div className="kp-card kp-card-hoverable p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1d2a3d] pb-3 text-xs text-[#a1afc7] font-semibold">
            <span>TEST NAME & DATE</span>
            <span>METRIC & TIER</span>
          </div>

          <div className="space-y-3">
            {assessments.map((record) => {
              const res = record.resultData;
              const isLong = record.testType === 'LONG_JUMP';
              const metricStr = isLong
                ? `${res?.metrics?.jump_distance_m || '--'} m`
                : `${res?.metrics?.jump_height_cm || '--'} cm`;
              const tierStr = isLong ? 'Long Jump' : 'Vertical Jump';
              const formattedDate = new Date(record.date).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
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
                      <p className="font-bold text-white text-base">{record.testName}</p>
                      <p className="text-xs text-[#a1afc7]">Completed on {formattedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xl font-black text-[#d4ff4d]">{metricStr}</p>
                      <span className="kp-pill active">{tierStr}</span>
                    </div>

                    <button
                      onClick={() => onViewReport(res)}
                      className="kp-button py-2 px-4 text-xs"
                    >
                      View Full Report →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
