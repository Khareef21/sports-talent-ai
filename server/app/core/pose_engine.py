import os
import urllib.request
from typing import Optional

import cv2
import numpy as np

from mediapipe import Image, ImageFormat
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmark,
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from app.core.physics import jump_metrics_from_flight_time

VISIBILITY_THRESHOLD = 0.5
AIRBORNE_Y_THRESHOLD = 0.04
MIN_AIRBORNE_FRAMES = 3
MAX_DURATION_SEC = 60.0
MIN_DURATION_SEC = 1.0

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = os.path.abspath(os.path.join(MODEL_DIR, "pose_landmarker_lite.task"))

REQUIRED_LANDMARKS = [
    PoseLandmark.NOSE,
    PoseLandmark.LEFT_SHOULDER,
    PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_HIP,
    PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE,
    PoseLandmark.RIGHT_KNEE,
]


class QualityError(ValueError):
    """Video quality / detection failure with structured checks for the UI."""

    def __init__(self, message: str, quality_checks: Optional[dict] = None):
        super().__init__(message)
        self.quality_checks = quality_checks or {}


def _ensure_model() -> str:
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1000:
        return MODEL_PATH
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def _visibility(landmark) -> float:
    if landmark.visibility is not None:
        return landmark.visibility
    if landmark.presence is not None:
        return landmark.presence
    return 1.0


def _interpolate_nones(values: list, max_gap_frames: int = 3) -> list:
    """
    Interpolate short runs of None values but leave leading/trailing None runs
    and gaps longer than max_gap_frames unfilled.

    This prevents long pose-loss intervals from being spuriously filled and
    creating false airborne segments.
    """
    result = list(values)
    n = len(result)
    i = 0
    while i < n:
        if result[i] is None:
            prev_i = i - 1
            prev_val = result[prev_i] if prev_i >= 0 else None
            next_i = i
            while next_i < n and result[next_i] is None:
                next_i += 1
            next_val = result[next_i] if next_i < n else None
            gap_len = next_i - i

            # Do not interpolate leading or trailing gaps
            if prev_val is None or next_val is None:
                # leave these as None
                i = next_i
                continue

            # Only interpolate small gaps
            if gap_len <= max_gap_frames:
                for j in range(i, next_i):
                    t = (j - prev_i) / (next_i - prev_i)
                    result[j] = prev_val + t * (next_val - prev_val)
            else:
                # Leave long gaps as None
                i = next_i
                continue
            i = next_i
        else:
            i += 1
    return result


def _open_capture(video_path: str) -> tuple[cv2.VideoCapture, float, int, float]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise QualityError(
            "Video could not be read. Please try a different file.",
            {
                "person_detected": False,
                "full_body_visible": False,
                "feet_visible": False,
                "enough_frames": False,
                "movement_detected": False,
            },
        )

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or np.isnan(fps) or fps < 1:
        fps = 30.0

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps else 0.0
    return cap, fps, frame_count, duration


def _create_landmarker(running_mode: RunningMode) -> PoseLandmarker:
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=_ensure_model()),
        running_mode=running_mode,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return PoseLandmarker.create_from_options(options)


def _landmark_at(pose, index: int):
    if index < len(pose):
        return pose[index]
    return None


def inspect_video_quality(video_path: str) -> dict:
    """Fast pre-check: duration + sampled pose frames. Does not compute jump height."""
    cap, fps, reported_frames, duration = _open_capture(video_path)

    if duration > MAX_DURATION_SEC:
        cap.release()
        raise QualityError(
            f"Video is {duration:.1f}s long. Please upload a video of 60 seconds or less.",
            {
                "person_detected": False,
                "full_body_visible": False,
                "feet_visible": False,
                "enough_frames": False,
                "movement_detected": False,
            },
        )

    landmarker = _create_landmarker(RunningMode.IMAGE)
    detection_flags: list[bool] = []
    full_body_flags: list[bool] = []
    ankle_vis_flags: list[bool] = []
    ankle_ys: list[float] = []
    sampled = 0
    frame_idx = 0
    sample_every = 3

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % sample_every != 0:
                continue

            sampled += 1
            rgb = np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)
            result = landmarker.detect(mp_image)

            if not result.pose_landmarks:
                detection_flags.append(False)
                full_body_flags.append(False)
                ankle_vis_flags.append(False)
                continue

            pose = result.pose_landmarks[0]
            la = _landmark_at(pose, PoseLandmark.LEFT_ANKLE)
            ra = _landmark_at(pose, PoseLandmark.RIGHT_ANKLE)
            if la is None or ra is None:
                detection_flags.append(True)
                full_body_flags.append(False)
                ankle_vis_flags.append(False)
                continue

            ankles_visible = (
                _visibility(la) > VISIBILITY_THRESHOLD
                and _visibility(ra) > VISIBILITY_THRESHOLD
            )
            required_vis = all(
                (lm := _landmark_at(pose, idx)) is not None
                and _visibility(lm) > VISIBILITY_THRESHOLD
                for idx in REQUIRED_LANDMARKS
            )

            detection_flags.append(True)
            full_body_flags.append(required_vis)
            ankle_vis_flags.append(ankles_visible)
            ankle_ys.append((la.y + ra.y) / 2.0)
    finally:
        cap.release()
        landmarker.close()

    total = max(sampled, 1)
    detection_rate = sum(detection_flags) / total if detection_flags else 0.0
    full_body_rate = sum(full_body_flags) / total if full_body_flags else 0.0
    ankle_vis_rate = sum(ankle_vis_flags) / total if ankle_vis_flags else 0.0
    movement = (max(ankle_ys) - min(ankle_ys)) > 0.03 if len(ankle_ys) >= 2 else False

    quality_checks = {
        "person_detected": detection_rate >= 0.4,
        "full_body_visible": full_body_rate >= 0.3,
        "feet_visible": ankle_vis_rate >= 0.3,
        "enough_frames": frame_idx >= 10 or duration >= MIN_DURATION_SEC,
        "movement_detected": movement,
    }

    failed = [k for k, v in quality_checks.items() if not v]
    if failed:
        messages = {
            "person_detected": "No person detected in the video. Ensure your full body is visible and lighting is adequate.",
            "full_body_visible": "Full body is not clearly visible. Move farther from the camera so head-to-feet are in frame.",
            "feet_visible": "Could not reliably detect feet. Keep both feet visible throughout the jump.",
            "enough_frames": "Video is too short for analysis. Please record at least 2 seconds.",
            "movement_detected": "Could not detect a clear jump. Perform one visible vertical jump in frame.",
        }
        raise QualityError(messages[failed[0]], quality_checks)

    return {
        "quality_checks": quality_checks,
        "duration_sec": round(duration, 2),
        "fps": round(fps, 2),
        "sampled_frames": sampled,
    }


def analyze_vertical_jump(video_path: str) -> dict:
    """
    Analyzes a vertical jump video using MediaPipe Pose Landmarker.

    Raises QualityError on detection / quality failures.
    """
    cap, fps, _reported, duration = _open_capture(video_path)

    if duration > MAX_DURATION_SEC:
        cap.release()
        raise QualityError(
            f"Video is {duration:.1f}s long. Please upload a video of 60 seconds or less.",
            {
                "person_detected": False,
                "full_body_visible": False,
                "feet_visible": False,
                "enough_frames": False,
                "movement_detected": False,
            },
        )

    landmarker = _create_landmarker(RunningMode.VIDEO)

    # Collect per-frame landmark Y trajectories for ankles, knees and hips (None when missing)
    left_ankle_y: list[Optional[float]] = []
    right_ankle_y: list[Optional[float]] = []
    left_knee_y: list[Optional[float]] = []
    right_knee_y: list[Optional[float]] = []
    left_hip_y: list[Optional[float]] = []
    right_hip_y: list[Optional[float]] = []

    detection_flags: list[bool] = []
    full_body_flags: list[bool] = []
    ankle_vis_flags: list[bool] = []
    frame_count = 0
    last_ts = -1

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            timestamp_ms = int(round((frame_count - 1) * 1000.0 / fps))
            if timestamp_ms <= last_ts:
                timestamp_ms = last_ts + 1
            last_ts = timestamp_ms

            rgb = np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if not result.pose_landmarks:
                # append Nones for all trajectories
                left_ankle_y.append(None)
                right_ankle_y.append(None)
                left_knee_y.append(None)
                right_knee_y.append(None)
                left_hip_y.append(None)
                right_hip_y.append(None)
                detection_flags.append(False)
                full_body_flags.append(False)
                ankle_vis_flags.append(False)
                continue

            pose = result.pose_landmarks[0]
            la = _landmark_at(pose, PoseLandmark.LEFT_ANKLE)
            ra = _landmark_at(pose, PoseLandmark.RIGHT_ANKLE)
            lk = _landmark_at(pose, PoseLandmark.LEFT_KNEE)
            rk = _landmark_at(pose, PoseLandmark.RIGHT_KNEE)
            lh = _landmark_at(pose, PoseLandmark.LEFT_HIP)
            rh = _landmark_at(pose, PoseLandmark.RIGHT_HIP)

            # Append values or None
            left_ankle_y.append(la.y if la is not None else None)
            right_ankle_y.append(ra.y if ra is not None else None)
            left_knee_y.append(lk.y if lk is not None else None)
            right_knee_y.append(rk.y if rk is not None else None)
            left_hip_y.append(lh.y if lh is not None else None)
            right_hip_y.append(rh.y if rh is not None else None)

            if la is None or ra is None:
                detection_flags.append(True)
                full_body_flags.append(False)
                ankle_vis_flags.append(False)
                continue

            ankles_visible = (
                _visibility(la) > VISIBILITY_THRESHOLD
                and _visibility(ra) > VISIBILITY_THRESHOLD
            )
            required_vis = all(
                (lm := _landmark_at(pose, idx)) is not None
                and _visibility(lm) > VISIBILITY_THRESHOLD
                for idx in REQUIRED_LANDMARKS
            )

            detection_flags.append(True)
            full_body_flags.append(required_vis)
            ankle_vis_flags.append(ankles_visible)
    finally:
        cap.release()
        landmarker.close()

    # Build combined ankle history (average) for backward compatibility
    ankle_y_history = [
        (l + r) / 2.0 if (l is not None and r is not None) else (l if r is None else r)
        for l, r in zip(left_ankle_y, right_ankle_y)
    ]

    total_frames = frame_count
    empty_checks = {
        "person_detected": False,
        "full_body_visible": False,
        "feet_visible": False,
        "enough_frames": False,
        "movement_detected": False,
    }
    if total_frames == 0:
        raise QualityError("Video could not be read. Please try a different file.", empty_checks)

    detection_rate = sum(detection_flags) / total_frames
    full_body_rate = sum(full_body_flags) / total_frames
    ankle_vis_rate = sum(ankle_vis_flags) / total_frames

    quality_checks = {
        "person_detected": detection_rate >= 0.5,
        "full_body_visible": full_body_rate >= 0.4,
        "feet_visible": ankle_vis_rate >= 0.4,
        "enough_frames": total_frames >= 10,
        "movement_detected": False,
    }

    if not quality_checks["person_detected"]:
        raise QualityError(
            "No person detected in the video. Ensure your full body is visible and lighting is adequate.",
            quality_checks,
        )

    if not quality_checks["enough_frames"]:
        raise QualityError(
            "Video is too short for analysis. Please record at least 2 seconds.",
            quality_checks,
        )

    if not quality_checks["full_body_visible"]:
        raise QualityError(
            "Full body is not clearly visible. Move farther from the camera so head-to-feet are in frame.",
            quality_checks,
        )

    valid_ankles = [y for y in ankle_y_history if y is not None]
    if len(valid_ankles) < 5:
        quality_checks["feet_visible"] = False
        raise QualityError(
            "Could not reliably detect feet across the video. Keep both feet visible throughout the jump.",
            quality_checks,
        )

    # Interpolate short missing runs but do not fill leading/trailing gaps or long gaps
    max_gap_frames = max(3, int(round(fps * 0.1)))  # allow interpolation for gaps up to ~0.1s
    ankle_y_smooth = _interpolate_nones(ankle_y_history, max_gap_frames=max_gap_frames)

    valid_vals = [y for y in ankle_y_smooth if y is not None]
    if not valid_vals:
        quality_checks["movement_detected"] = False
        raise QualityError(
            "Could not detect reliable ankle positions to analyze jump.",
            quality_checks,
        )

    ground_baseline = np.percentile(valid_vals, 90)
    airborne_threshold = ground_baseline - AIRBORNE_Y_THRESHOLD

    # Only mark airborne where we have a (possibly interpolated) value
    airborne_mask = [(y is not None) and (y < airborne_threshold) for y in ankle_y_smooth]
    quality_checks["movement_detected"] = any(airborne_mask)

    # Velocity-based detector implementation
    def _smooth(values: list[Optional[float]], window_frames: int) -> list[Optional[float]]:
        arr = np.array([np.nan if v is None else v for v in values], dtype=float)
        # simple moving average with nan handling
        kernel = np.ones(window_frames) / float(window_frames)
        conv = np.convolve(np.nan_to_num(arr, nan=0.0), kernel, mode="same")
        counts = np.convolve((~np.isnan(arr)).astype(float), np.ones(window_frames), mode="same")
        with np.errstate(invalid="ignore", divide="ignore"):
            smooth = np.where(counts > 0, conv / counts, np.nan)
        return [None if np.isnan(x) else float(x) for x in smooth]

    def _velocity_candidate(left_y, right_y, left_vis_mask, right_vis_mask, fps) -> dict:
        # Returns candidate dict or None
        n = len(left_y)
        # Convert Nones to np.nan arrays, smooth
        window = max(3, int(round(fps * 0.06)))  # ~60ms window conservative
        l_s = _smooth(left_y, window)
        r_s = _smooth(right_y, window)

        def compute_vel(smooth):
            arr = np.array([np.nan if v is None else v for v in smooth], dtype=float)
            # velocity aligned to frame indices 1..n-1 (we pad a leading nan)
            delta = np.diff(arr)
            dt = 1.0 / float(fps)
            vel = delta / dt
            vel = np.concatenate(([np.nan], vel))
            return vel.tolist()

        l_vel = compute_vel(l_s)
        r_vel = compute_vel(r_s)

        # typical scale: y are normalized [0,1]; choose thresholds relative to observed noise
        # compute median absolute velocity for scale
        all_vels = np.array([v for v in (l_vel + r_vel) if v is not None and not np.isnan(v)], dtype=float)
        med_abs = float(np.median(np.abs(all_vels))) if all_vels.size else 0.0
        v_thresh = max(0.02, med_abs * 3.0)

        # find candidate takeoff: first frame where velocity is strongly negative (upward movement)
        def find_candidate_from_vel(vel):
            cand = -1
            for i, v in enumerate(vel):
                if v is None or (isinstance(v, float) and np.isnan(v)):
                    continue
                if v < -v_thresh:
                    cand = i
                    break
            return cand

        l_c = find_candidate_from_vel(l_vel)
        r_c = find_candidate_from_vel(r_vel)

        # Determine which ankle to prefer based on visibility masks count
        # Build visibility counts
        l_vis_count = sum(1 for x in left_vis_mask if x)
        r_vis_count = sum(1 for x in right_vis_mask if x)

        chosen = None
        if l_c != -1 and r_c != -1:
            if abs(l_c - r_c) <= max(2, int(round(fps * 0.05))):
                # agreement
                chosen_takeoff = int(round((l_c + r_c) / 2.0))
                source = "both"
            else:
                # pick more visible ankle
                if l_vis_count >= r_vis_count:
                    chosen_takeoff = l_c
                    source = "left"
                else:
                    chosen_takeoff = r_c
                    source = "right"
        elif l_c != -1:
            chosen_takeoff = l_c
            source = "left"
        elif r_c != -1:
            chosen_takeoff = r_c
            source = "right"
        else:
            return {}

        # find landing: search after chosen_takeoff for when vertical velocity becomes strongly positive or y returns close to baseline
        def find_landing_from_takeoff(smooth_left, smooth_right, vel_left, vel_right, start_idx):
            # look for the first frame after start_idx where vel > v_thresh OR ankle returns near baseline
            n = len(smooth_left)
            baseline = ground_baseline
            for i in range(start_idx + 3, n):
                v_left = vel_left[i] if i < len(vel_left) else None
                v_right = vel_right[i] if i < len(vel_right) else None
                cond_vel = (isinstance(v_left, float) and not np.isnan(v_left) and v_left > v_thresh) or (isinstance(v_right, float) and not np.isnan(v_right) and v_right > v_thresh)
                # check y proximity to baseline
                y_l = smooth_left[i]
                y_r = smooth_right[i]
                y_close = False
                if y_l is not None and abs(y_l - baseline) < 0.02:
                    y_close = True
                if y_r is not None and abs(y_r - baseline) < 0.02:
                    y_close = True
                if cond_vel or y_close:
                    return i
            return -1

        landing_idx = find_landing_from_takeoff(l_s, r_s, l_vel, r_vel, chosen_takeoff)
        if landing_idx == -1:
            # fallback: use when velocities show gradual return near end
            return {}

        # compute ankle agreement metric: fraction of frames in (takeoff,landing) where both ankles confidently visible
        start = chosen_takeoff
        end = landing_idx
        agree_count = 0
        total = 0
        for i in range(start, end + 1):
            lvis = left_vis_mask[i] if i < len(left_vis_mask) else False
            rvis = right_vis_mask[i] if i < len(right_vis_mask) else False
            if lvis or rvis:
                total += 1
                if lvis and rvis:
                    agree_count += 1
        ankle_agreement = (agree_count / total) if total > 0 else 0.0

        candidate = {
            "takeoff_frame": chosen_takeoff,
            "landing_frame": landing_idx,
            "airborne_frames": landing_idx - chosen_takeoff,
            "source": source,
            "ankle_agreement": round(ankle_agreement, 3),
            "v_thresh": float(v_thresh),
        }
        return candidate

    # Prepare visibility masks for left/right ankles
    left_vis_mask = [
        (_visibility_val := None) or False for _ in range(total_frames)
    ]
    right_vis_mask = [False for _ in range(total_frames)]
    # Fill masks from ankle_vis_flags and detection flags when available
    # We don't have per-frame raw visibility booleans for individual ankles earlier, so derive from ankle_vis_flags where True indicates both visible
    for i in range(total_frames):
        if i < len(ankle_vis_flags) and ankle_vis_flags[i]:
            left_vis_mask[i] = True
            right_vis_mask[i] = True
        else:
            # we mark per-ankle visibility True only if the corresponding raw y is present
            left_vis_mask[i] = left_ankle_y[i] is not None
            right_vis_mask[i] = right_ankle_y[i] is not None

    vel_candidate = _velocity_candidate(left_ankle_y, right_ankle_y, left_vis_mask, right_vis_mask, fps)

    # Threshold-based candidate (existing)
    # Find the longest contiguous airborne segment (as before)
    best_start = -1
    best_end = -1
    best_length = 0
    cur_start = -1
    cur_length = 0
    for i, is_air in enumerate(airborne_mask):
        if is_air:
            if cur_start == -1:
                cur_start = i
            cur_length += 1
            if cur_length > best_length:
                best_length = cur_length
                best_start = cur_start
                best_end = i
        else:
            cur_start = -1
            cur_length = 0

    threshold_candidate = None
    if best_length >= MIN_AIRBORNE_FRAMES:
        threshold_candidate = {
            "takeoff_frame": best_start,
            "landing_frame": best_end,
            "airborne_frames": best_length,
            "source": "threshold",
        }

    # Candidate selection logic
    MIN_REASONABLE_HANG_TIME = 0.08  # seconds
    MAX_REASONABLE_HANG_TIME = 1.5  # seconds — safety upper bound

    selected = None
    rejection_reason = None
    # If both candidates exist, prefer velocity if it aligns with threshold and has good ankle agreement
    if vel_candidate and threshold_candidate:
        # check alignment: takeoffs within ~0.2s
        max_frame_diff = max(3, int(round(fps * 0.2)))
        if abs(vel_candidate["takeoff_frame"] - threshold_candidate["takeoff_frame"]) <= max_frame_diff and abs(vel_candidate["landing_frame"] - threshold_candidate["landing_frame"]) <= max_frame_diff:
            # good agreement
            selected = vel_candidate
        else:
            # prefer candidate with higher ankle agreement or more plausible hang time
            vel_hang = vel_candidate["airborne_frames"] / fps
            thr_hang = threshold_candidate["airborne_frames"] / fps
            # choose velocity if ankle agreement > 0.5 and hang time plausible
            if vel_candidate.get("ankle_agreement", 0.0) >= 0.5 and (MIN_REASONABLE_HANG_TIME <= vel_hang <= MAX_REASONABLE_HANG_TIME):
                selected = vel_candidate
            elif MIN_REASONABLE_HANG_TIME <= thr_hang <= MAX_REASONABLE_HANG_TIME:
                selected = threshold_candidate
            else:
                # ambiguous
                rejection_reason = "conflicting_candidates"
    elif vel_candidate:
        hang = vel_candidate["airborne_frames"] / fps
        if MIN_REASONABLE_HANG_TIME <= hang <= MAX_REASONABLE_HANG_TIME:
            selected = vel_candidate
        else:
            rejection_reason = "velocity_candidate_implausible"
    elif threshold_candidate:
        hang = threshold_candidate["airborne_frames"] / fps
        if MIN_REASONABLE_HANG_TIME <= hang <= MAX_REASONABLE_HANG_TIME:
            selected = threshold_candidate
        else:
            rejection_reason = "threshold_candidate_implausible"
    else:
        rejection_reason = "no_candidate"

    if selected is None:
        diagnostics = {
            "fps": round(fps, 3),
            "total_frames": total_frames,
            "valid_pose_frames": len(valid_vals),
            "ground_baseline": float(ground_baseline),
            "threshold_candidate": threshold_candidate,
            "velocity_candidate": vel_candidate,
            "rejection_reason": rejection_reason,
        }
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError("Could not confidently detect takeoff/landing.", qc)

    # Normalize selected to have takeoff/landing keys
    takeoff_frame = int(selected["takeoff_frame"])
    landing_frame = int(selected["landing_frame"])
    airborne_frames = int(selected["airborne_frames"])

    # Additional checks: do not accept segments that start at first/last frame
    diagnostics = {
        "fps": round(fps, 3),
        "total_frames": total_frames,
        "valid_pose_frames": len(valid_vals),
        "ground_baseline": float(ground_baseline),
        "threshold_candidate": threshold_candidate,
        "velocity_candidate": vel_candidate,
        "selected_source": selected.get("source") if isinstance(selected, dict) else None,
    }

    if takeoff_frame <= 0 or landing_frame >= total_frames - 1:
        diagnostics.update({
            "takeoff_frame": takeoff_frame,
            "landing_frame": landing_frame,
            "takeoff_timestamp_sec": round(takeoff_frame / float(fps), 3),
            "landing_timestamp_sec": round(landing_frame / float(fps), 3),
        })
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError("Ambiguous takeoff/landing near video boundaries.", qc)

    # Ensure there was not a long pose-loss inside the chosen airborne window
    def _max_none_gap_in_range(values, start, end):
        max_gap = 0
        cur_gap = 0
        for v in values[start : end + 1]:
            if v is None:
                cur_gap += 1
                max_gap = max(max_gap, cur_gap)
            else:
                cur_gap = 0
        return max_gap

    long_none_gap = _max_none_gap_in_range(ankle_y_history, takeoff_frame, landing_frame)
    if long_none_gap > max_gap_frames:
        diagnostics.update({
            "takeoff_frame": takeoff_frame,
            "landing_frame": landing_frame,
            "long_none_gap": int(long_none_gap),
        })
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError(
            "Pose was lost for too long during the detected airborne interval.",
            qc,
        )

    # Flight time calculation using actual video fps and frame indices
    # Use (landing_frame - takeoff_frame) / fps per requirements
    hang_time_sec = (landing_frame - takeoff_frame) / float(fps)

    # Sanity bounds for hang time — reject implausible results rather than clamping
    MIN_REASONABLE_HANG_TIME = 0.08  # seconds
    MAX_REASONABLE_HANG_TIME = 1.5  # seconds — safety upper bound
    if hang_time_sec < MIN_REASONABLE_HANG_TIME or hang_time_sec > MAX_REASONABLE_HANG_TIME:
        diagnostics.update({
            "takeoff_frame": takeoff_frame,
            "landing_frame": landing_frame,
            "takeoff_timestamp_sec": round(takeoff_frame / float(fps), 3),
            "landing_timestamp_sec": round(landing_frame / float(fps), 3),
            "hang_time_sec": round(hang_time_sec, 3),
        })
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError(
            "Detected airborne duration is outside reasonable human limits.",
            qc,
        )

    # Ensure there was not a long pose-loss inside the chosen airborne window
    def _max_none_gap_in_range(values, start, end):
        max_gap = 0
        cur_gap = 0
        for v in values[start : end + 1]:
            if v is None:
                cur_gap += 1
                max_gap = max(max_gap, cur_gap)
            else:
                cur_gap = 0
        return max_gap

    long_none_gap = _max_none_gap_in_range(ankle_y_history, takeoff_frame, landing_frame)
    if long_none_gap > max_gap_frames:
        diagnostics.update({
            "takeoff_frame": takeoff_frame,
            "landing_frame": landing_frame,
            "long_none_gap": int(long_none_gap),
        })
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError(
            "Pose was lost for too long during the detected airborne interval.",
            qc,
        )

    # Flight time calculation using actual video fps and frame indices
    # Use (landing_frame - takeoff_frame) / fps per requirements
    hang_time_sec = (landing_frame - takeoff_frame) / float(fps)

    # Sanity bounds for hang time — reject implausible results rather than clamping
    MIN_REASONABLE_HANG_TIME = 0.08  # seconds
    MAX_REASONABLE_HANG_TIME = 1.5  # seconds — safety upper bound
    if hang_time_sec < MIN_REASONABLE_HANG_TIME or hang_time_sec > MAX_REASONABLE_HANG_TIME:
        diagnostics.update({
            "takeoff_frame": takeoff_frame,
            "landing_frame": landing_frame,
            "takeoff_timestamp_sec": round(takeoff_frame / float(fps), 3),
            "landing_timestamp_sec": round(landing_frame / float(fps), 3),
            "hang_time_sec": round(hang_time_sec, 3),
        })
        qc = dict(quality_checks)
        qc.update({"diagnostics": diagnostics})
        raise QualityError(
            "Detected airborne duration is outside reasonable human limits.",
            qc,
        )

    physics = jump_metrics_from_flight_time(hang_time_sec)

    hang_time_quality = min(1.0, max(0.0, (hang_time_sec - 0.1) / 0.7)) if hang_time_sec >= 0.1 else 0.0
    confidence = (
        0.30 * min(1.0, detection_rate)
        + 0.25 * min(1.0, full_body_rate)
        + 0.25 * min(1.0, ankle_vis_rate)
        + 0.20 * hang_time_quality
    )

    # Save diagnostics CSV for offline inspection (frame_idx, raw/interp values, airborne flags, velocity)
    try:
        diag_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "diagnostics"))
        os.makedirs(diag_dir, exist_ok=True)
        vid_name = os.path.splitext(os.path.basename(video_path))[0]
        csv_path = os.path.join(diag_dir, f"{vid_name}_ankle_trajectory.csv")
        # attempt to compute smoothed and velocity for both ankles for CSV if present
        try:
            # reuse smoothing defined above
            window = max(3, int(round(fps * 0.06)))
            def safe_smooth(values):
                arr = np.array([np.nan if v is None else v for v in values], dtype=float)
                kernel = np.ones(window) / float(window)
                conv = np.convolve(np.nan_to_num(arr, nan=0.0), kernel, mode="same")
                counts = np.convolve((~np.isnan(arr)).astype(float), np.ones(window), mode="same")
                with np.errstate(invalid="ignore", divide="ignore"):
                    smooth = np.where(counts > 0, conv / counts, np.nan)
                return [None if np.isnan(x) else float(x) for x in smooth]

            l_s = safe_smooth(left_ankle_y)
            r_s = safe_smooth(right_ankle_y)
            def vel_list(smooth):
                arr = np.array([np.nan if v is None else v for v in smooth], dtype=float)
                delta = np.diff(arr)
                dt = 1.0 / float(fps)
                vel = delta / dt
                vel = np.concatenate(([np.nan], vel))
                return [None if np.isnan(x) else float(x) for x in vel]
            l_v = vel_list(l_s)
            r_v = vel_list(r_s)
        except Exception:
            l_s = [None] * total_frames
            r_s = [None] * total_frames
            l_v = [None] * total_frames
            r_v = [None] * total_frames

        with open(csv_path, "w", encoding="utf-8") as fh:
            fh.write("frame,raw_left_ankle,raw_right_ankle,smooth_left,smooth_right,vel_left,vel_right,airborne_threshold,airborne_new,airborne_old\n")
            for i in range(total_frames):
                raw_l = "" if left_ankle_y[i] is None else f"{left_ankle_y[i]:.6f}"
                raw_r = "" if right_ankle_y[i] is None else f"{right_ankle_y[i]:.6f}"
                sl = "" if l_s[i] is None else f"{l_s[i]:.6f}"
                sr = "" if r_s[i] is None else f"{r_s[i]:.6f}"
                vl = "" if l_v[i] is None else f"{l_v[i]:.6f}"
                vr = "" if r_v[i] is None else f"{r_v[i]:.6f}"
                air_new = 1 if (i < len(airborne_mask) and airborne_mask[i]) else 0
                air_old = 0
                fh.write(f"{i},{raw_l},{raw_r},{sl},{sr},{vl},{vr},{airborne_threshold if 'airborne_threshold' in locals() else ''},{air_new},{air_old}\n")
    except Exception:
        # Do not fail the analysis if diagnostics cannot be written
        pass

    return {
        "jump_height_cm": physics["jump_height_cm"],
        "hang_time_sec": round(hang_time_sec, 3),
        "takeoff_frame": takeoff_frame,
        "landing_frame": landing_frame,
        "airborne_frames": airborne_frames,
        "fps": round(fps, 3),
        "total_frames": total_frames,
        "takeoff_velocity_mps": physics["takeoff_velocity_mps"],
        "measurement_confidence": round(confidence * 100, 1),
        "quality_checks": quality_checks,
        "formula": physics["formula"],
        "g_used": physics["g_used"],
        "diagnostics": diagnostics,
        "diagnostics_csv": csv_path if 'csv_path' in locals() else None,
    }
