import AppIcon from './ui/AppIcon';
import React, { useState } from 'react';

function MetricCard({ label, value, unit, color = 'text-white', sub }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>
        {value}
        {unit && <span className="text-base font-normal text-gray-400 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function ConfidenceBar({ pct }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Measurement Confidence</span>
        <span className={pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AssessmentReport({ data, onReset, isDemo }) {
  const [showCalc, setShowCalc] = useState(false);

  if (!data) return null;

  const { athlete, metrics, report } = data;
  const isLongJump = data.assessment_type === 'LONG_JUMP' || metrics?.jump_distance_m !== undefined || metrics?.distance_m !== undefined;
  const {
    jump_height_cm,
    hang_time_sec,
    takeoff_frame,
    landing_frame,
    fps,
    takeoff_velocity_mps,
    measurement_confidence,
    calibration_confidence,
    measurement_uncertainty_m,
    quality_checks,
    g_used,
    jump_distance_m,
    distance_m,
    takeoff_quality,
    landing_quality,
    technique_score,
    detection_confidence,
    calibration,
  } = metrics;

  const finalDistanceM = distance_m ?? jump_distance_m;

  const tierColor = isLongJump ? 'bg-blue-600' : 'bg-gray-600';

  const qcItems = [
    { key: 'person_detected',   label: 'Full body detected' },
    { key: 'feet_visible',      label: 'Feet visible' },
    { key: 'movement_detected', label: 'Clear movement' },
    { key: 'enough_frames',     label: 'Sufficient footage' },
  ];

  const calibValid = calibration?.valid !== false;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Athlete Performance Report</h2>
          <p className="text-xs text-gray-500">Assessment: {isLongJump ? 'Long Jump' : 'Vertical Jump'}</p>
        </div>
        <div className="flex gap-2 flex-col items-end">
          <span className={`text-xs px-3 py-1 rounded-full font-bold text-white ${tierColor}`}>
            {isLongJump ? 'Long Jump Measured' : 'Performance Report'}
          </span>
          {isDemo && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-yellow-300 bg-yellow-900/60 border border-yellow-700">
              <><AppIcon name="spark" size={14} /> DEMO</>
            </span>
          )}
        </div>
      </div>

      {/* Athlete info */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-500 text-xs">Name</p><p className="font-bold text-white">{athlete?.full_name || '—'}</p></div>
        <div><p className="text-gray-500 text-xs">Age</p><p className="font-bold text-white">{athlete?.age || '—'}</p></div>
        <div><p className="text-gray-500 text-xs">Gender</p><p className="font-bold text-white">{athlete?.gender || '—'}</p></div>
        <div><p className="text-gray-500 text-xs">Location</p><p className="font-bold text-white">{athlete?.location || '—'}</p></div>
      </div>

      {/* Primary metric */}
      {isLongJump && !calibValid ? (
        <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-6 text-center space-y-2">
          <p className="text-xs text-red-400 uppercase tracking-widest font-bold">Calibration Failed</p>
          <p className="text-sm text-red-200">
            Calibration failed. Keep the reference object fully visible on the same ground plane and record again.
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-950/60 to-gray-900 border border-blue-800/40 rounded-xl p-6 text-center">
          <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">{isLongJump ? 'Calibrated Jump Distance' : 'Jump Height'}</p>
          <p className="text-6xl font-black text-white">
            {isLongJump ? finalDistanceM : jump_height_cm}
            <span className="text-2xl text-gray-400 font-normal ml-2">{isLongJump ? 'm' : 'cm'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {isLongJump ? 'Ground plane homography perspective transformation' : 'AI detects movement · Physics calculates performance'}
          </p>
        </div>
      )}

      {/* Calibration status banner for Long Jump */}
      {isLongJump && calibValid && (
        <div className="bg-[#0f1c2d] border border-[#74c9ff]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-2"><AppIcon name="check" size={14} /> Reference detected</span>
            <span>•</span>
            <span className="flex items-center gap-2"><AppIcon name="check" size={14} /> Ground plane calibrated</span>
            <span>•</span>
            <span className="flex items-center gap-2"><AppIcon name="check" size={14} /> Takeoff/landing measurable</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-[#06121a] p-2.5 rounded-lg border border-[#1d2a3d]">
              <p className="text-[10px] text-[#a1afc7] uppercase font-semibold">Calib. Confidence</p>
              <p className="text-base font-bold text-emerald-400">{calibration_confidence ?? 90}%</p>
            </div>
            <div className="bg-[#06121a] p-2.5 rounded-lg border border-[#1d2a3d]">
              <p className="text-[10px] text-[#a1afc7] uppercase font-semibold">Meas. Confidence</p>
              <p className="text-base font-bold text-[#74c9ff]">{measurement_confidence}%</p>
            </div>
            <div className="bg-[#06121a] p-2.5 rounded-lg border border-[#1d2a3d]">
              <p className="text-[10px] text-[#a1afc7] uppercase font-semibold">Est. Uncertainty</p>
              <p className="text-base font-bold text-yellow-400">
                ±{Math.round((measurement_uncertainty_m || 0.03) * 100)} cm
              </p>
            </div>
          </div>
          <p className="text-xs text-[#a1afc7]">
            Pose: {metrics.pose_confidence ?? '—'}% · Events: {metrics.event_detection_confidence ?? '—'}% ·
            {' '}calibration error: {calibration?.reprojection_error ?? '—'} m
          </p>
          {calibration?.visible_ground_extent_m && (
            <p className="text-xs text-[#a1afc7]">
              Visible calibrated ground: {calibration.visible_ground_extent_m.width_m} m × {calibration.visible_ground_extent_m.length_m} m
            </p>
          )}
          <p className="text-xs text-yellow-300">{metrics.landing_note || 'Estimated landing position; not an official competition measurement.'}</p>
        </div>
      )}

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        {isLongJump ? (
          <>
            <MetricCard label="Takeoff Quality" value={takeoff_quality} unit="%" color="text-yellow-400" />
            <MetricCard label="Landing Quality" value={landing_quality} unit="%" color="text-purple-400" />
            <MetricCard
              label="Confidence"
              value={`${measurement_confidence ?? detection_confidence ?? 0}%`}
              color={(measurement_confidence ?? detection_confidence) >= 80 ? 'text-green-400' : (measurement_confidence ?? detection_confidence) >= 60 ? 'text-yellow-400' : 'text-red-400'}
            />
          </>
        ) : (
          <>
            <MetricCard label="Flight Time" value={hang_time_sec} unit="sec" color="text-yellow-400" />
            {takeoff_velocity_mps !== undefined && (
              <MetricCard label="Takeoff Vel." value={takeoff_velocity_mps} unit="m/s" color="text-purple-400" />
            )}
            <MetricCard label="Confidence" value={`${measurement_confidence}%`} color={measurement_confidence >= 80 ? 'text-green-400' : measurement_confidence >= 60 ? 'text-yellow-400' : 'text-red-400'} />
          </>
        )}
      </div>

      {/* Confidence bar + quality indicators */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3">
        <ConfidenceBar pct={measurement_confidence} />
        {quality_checks && (
          <div className="grid grid-cols-2 gap-1 pt-1">
            {qcItems.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span className={quality_checks[key] !== false ? 'text-green-400' : 'text-red-400'}>
                  <AppIcon name={quality_checks[key] !== false ? 'check' : 'x'} size={14} />
                </span>
                <span className="text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLongJump && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-300">Long Jump Breakdown</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"><p className="text-gray-500 text-[10px] uppercase">Technique</p><p className="text-white font-bold text-xl">{technique_score ?? 0}</p></div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"><p className="text-gray-500 text-[10px] uppercase">Takeoff</p><p className="text-white font-bold text-xl">{takeoff_quality ?? 0}</p></div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"><p className="text-gray-500 text-[10px] uppercase">Landing</p><p className="text-white font-bold text-xl">{landing_quality ?? 0}</p></div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"><p className="text-gray-500 text-[10px] uppercase">Confidence</p><p className="text-white font-bold text-xl">{measurement_confidence ?? 0}%</p></div>
          </div>
        </div>
      )}

      {/* Explainability — How was this calculated */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800 transition"
        >
          <span className="flex items-center gap-2"><AppIcon name="flask" size={15} /> How was this calculated?</span>
          <span className="text-gray-500">{showCalc ? '▲' : '▼'}</span>
        </button>
        {showCalc && (
          <div className="px-4 pb-4 space-y-3 text-sm border-t border-gray-800">
            <p className="text-gray-500 text-xs pt-2">
              {isLongJump
                ? 'Reference object corners were detected to build a perspective homography matrix H mapping image pixels to ground-plane meters. Takeoff and landing foot positions were transformed through H to compute ground distance.'
                : 'MediaPipe Pose tracked ankle landmarks frame-by-frame. The longest airborne segment (feet above ground baseline) was identified to find takeoff and landing frames.'}
            </p>
            <div className="bg-gray-800/60 rounded-lg p-3 font-mono text-xs space-y-1 text-gray-300">
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-500">Takeoff frame</span><span>{takeoff_frame ?? '—'}</span>
                <span className="text-gray-500">Landing frame</span><span>{landing_frame ?? '—'}</span>
                <span className="text-gray-500">Video FPS</span><span>{fps}</span>
                <span className="text-gray-500">Airborne sec</span><span>{hang_time_sec ?? metrics?.airborne_sec} s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coach insight */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold text-gray-300">Coach Summary</p>
        <p className="text-sm text-gray-300 leading-relaxed">{report?.coach_summary}</p>
      </div>

      {/* Tips */}
      {report?.improvement_tips?.length > 0 && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-300 font-sans">Technical Tips</p>
          <ul className="space-y-2">
            {report.improvement_tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-blue-400 font-bold mt-0.5">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-bold text-sm transition"
      >
        <><AppIcon name="report" size={15} /> Assess Another Athlete</>
      </button>
    </div>
  );
}
