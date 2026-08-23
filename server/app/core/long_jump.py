import os
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from mediapipe import Image, ImageFormat
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from app.core.long_jump_calibration import (
    CalibrationError,
    calibrate_from_frames,
    calibrate_ground_plane,
    ground_distance_m,
)

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "pose_landmarker_lite.task"))
MAX_POSE_STEP_NORM = 0.5


class LongJumpError(ValueError):
    def __init__(self, message: str, quality_checks: Optional[dict] = None, details: Optional[dict] = None):
        super().__init__(message)
        self.quality_checks = quality_checks or {}
        self.details = details or {}


def _ensure_model() -> str:
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1000:
        return MODEL_PATH
    import urllib.request

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
        MODEL_PATH,
    )
    return MODEL_PATH


def _create_landmarker(running_mode: RunningMode) -> PoseLandmarker:
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=_ensure_model()),
        running_mode=running_mode,
        num_poses=1,
        min_pose_detection_confidence=0.4,
        min_pose_presence_confidence=0.4,
        min_tracking_confidence=0.4,
    )
    return PoseLandmarker.create_from_options(options)


def _read_frame_history(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise LongJumpError(
            "Video could not be read. Please try a different file.",
            {"person_detected": False, "full_body_visible": False, "feet_visible": False, "enough_frames": False, "movement_detected": False},
        )

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps is None or fps <= 0 or np.isnan(fps):
        fps = 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)

    duration = total_frames / fps if fps else 0.0
    if duration > 60.0:
        cap.release()
        raise LongJumpError(
            f"Video is {duration:.1f}s long. Please upload a clip under 60 seconds.",
            {"person_detected": False, "full_body_visible": False, "feet_visible": False, "enough_frames": False, "movement_detected": False},
        )

    landmarker = _create_landmarker(RunningMode.VIDEO)
    history = []
    calib_frames = []

    try:
        frame_idx = 0
        last_ts = -1
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if len(calib_frames) < 15:
                calib_frames.append(frame.copy())
            frame_idx += 1
            timestamp_ms = int(round((frame_idx - 1) * 1000.0 / fps))
            if timestamp_ms <= last_ts:
                timestamp_ms = last_ts + 1
            last_ts = timestamp_ms

            rgb = np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if not result.pose_landmarks:
                history.append(None)
                continue

            pose = result.pose_landmarks[0]
            left_foot = pose[29] if len(pose) > 29 else None
            right_foot = pose[30] if len(pose) > 30 else None
            left_ankle = pose[27] if len(pose) > 27 else None
            right_ankle = pose[28] if len(pose) > 28 else None
            left_heel = pose[30] if len(pose) > 30 else None
            right_heel = pose[31] if len(pose) > 31 else None
            nose = pose[0] if len(pose) > 0 else None
            left_hip = pose[23] if len(pose) > 23 else None
            right_hip = pose[24] if len(pose) > 24 else None

            def safe_xy(lm):
                if lm is None:
                    return None, None
                return getattr(lm, "x", None), getattr(lm, "y", None)

            lx, ly = safe_xy(left_ankle)
            rx, ry = safe_xy(right_ankle)
            lf_x, lf_y = safe_xy(left_foot)
            rf_x, rf_y = safe_xy(right_foot)
            lh_x, lh_y = safe_xy(left_heel)
            rh_x, rh_y = safe_xy(right_heel)
            nose_y = getattr(nose, "y", None) if nose is not None else None
            hip_y = None
            if left_hip is not None and right_hip is not None:
                hy_values = [getattr(left_hip, "y", None), getattr(right_hip, "y", None)]
                hy_values = [v for v in hy_values if v is not None]
                hip_y = np.median(hy_values) if hy_values else None

            if lx is None and rx is None and lf_x is None and rf_x is None:
                history.append(None)
                continue

            left_x = lf_x if lf_x is not None else lx
            right_x = rf_x if rf_x is not None else rx
            left_y = lf_y if lf_y is not None else ly
            right_y = rf_y if rf_y is not None else ry

            history.append(
                {
                    "left_foot_x": left_x,
                    "right_foot_x": right_x,
                    "left_foot_y": left_y,
                    "right_foot_y": right_y,
                    "left_ankle_x": lx,
                    "right_ankle_x": rx,
                    "left_ankle_y": ly,
                    "right_ankle_y": ry,
                    "left_heel_x": lh_x,
                    "right_heel_x": rh_x,
                    "left_heel_y": lh_y,
                    "right_heel_y": rh_y,
                    "nose_y": nose_y,
                    "left_hip_y": getattr(left_hip, "y", None) if left_hip is not None else None,
                    "right_hip_y": getattr(right_hip, "y", None) if right_hip is not None else None,
                    "hip_y": hip_y,
                }
            )
    finally:
        cap.release()
        landmarker.close()

    if not history:
        raise LongJumpError("No pose landmarks were detected in the video.", {"person_detected": False, "full_body_visible": False, "feet_visible": False, "enough_frames": False, "movement_detected": False})

    return history, fps, frame_idx, calib_frames, (width, height)


def _foot_x(frame):
    if frame is None:
        return None
    left = frame.get("left_foot_x")
    right = frame.get("right_foot_x")
    if left is None and right is None:
        left = frame.get("left_ankle_x")
        right = frame.get("right_ankle_x")
    if left is None and right is not None:
        return right
    if right is None and left is not None:
        return left
    if left is None or right is None:
        return None
    return float(np.mean([left, right]))


def _foot_y(frame):
    if frame is None:
        return None
    left = frame.get("left_foot_y")
    right = frame.get("right_foot_y")
    if left is None and right is None:
        left = frame.get("left_ankle_y")
        right = frame.get("right_ankle_y")
    if left is None and right is not None:
        return right
    if right is None and left is not None:
        return left
    if left is None or right is None:
        return None
    return float(np.mean([left, right]))


def _write_long_jump_diagnostics(video_path: str, result: dict, frames) -> str | None:
    if not video_path or not os.path.exists(video_path):
        return None
    diag_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "diagnostics"))
    os.makedirs(diag_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(video_path))[0]
    csv_path = os.path.join(diag_dir, f"{base_name}_long_jump_diagnostics.csv")

    rows = [
        "frame_index,timestamp_sec,foot_x,foot_y,nose_y,airborne,selected_takeoff,selected_landing"
    ]
    for idx, frame in enumerate(frames):
        if frame is None:
            rows.append(f"{idx},{idx / max(float(result.get('fps', 30.0)), 1e-6):.3f},,, ,0,0,0")
            continue
        foot_x = _foot_x(frame)
        foot_y = _foot_y(frame)
        nose_y = frame.get("nose_y")
        is_air = False
        if foot_y is not None and nose_y is not None:
            is_air = float(foot_y) < float(nose_y) - 0.05
        rows.append(
            f"{idx},{idx / max(float(result.get('fps', 30.0)), 1e-6):.3f},{foot_x if foot_x is not None else ''},{foot_y if foot_y is not None else ''},{nose_y if nose_y is not None else ''},{int(is_air)},{int(idx == result.get('takeoff_frame'))},{int(idx == result.get('landing_frame'))}"
        )
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("\n".join(rows))

    return csv_path


def annotate_long_jump_frame(frame, calibration: Dict[str, Any], takeoff_xy=None, landing_xy=None):
    """Return an explainability overlay without changing the input frame."""
    if frame is None:
        return None
    annotated = frame.copy()
    corners = calibration.get("corner_points", [])
    if len(corners) == 4:
        polygon = np.asarray(corners, dtype=np.int32).reshape((-1, 1, 2))
        cv2.polylines(annotated, [polygon], True, (0, 220, 120), 3)
        for point in polygon.reshape((-1, 2)):
            cv2.circle(annotated, tuple(point), 7, (0, 220, 120), -1)
    if takeoff_xy is not None and landing_xy is not None:
        start = tuple(int(value) for value in takeoff_xy)
        end = tuple(int(value) for value in landing_xy)
        cv2.line(annotated, start, end, (255, 180, 0), 3)
        cv2.circle(annotated, start, 8, (0, 180, 255), -1)
        cv2.circle(annotated, end, 8, (0, 80, 255), -1)
    return annotated


def analyze_long_jump_from_landmark_history(
    frames,
    fps: float = 30.0,
    image_size: Tuple[int, int] = (1280, 720),
    calibration: Optional[Dict[str, Any]] = None,
    ref_width_m: float = 1.0,
    ref_height_m: float = 0.5,
    corner_override: Optional[List[Tuple[float, float]]] = None,
    demo_mode: bool = False,
):
    if frames is None or len(frames) == 0:
        raise LongJumpError(
            "No video frames were detected.",
            {"person_detected": False, "full_body_visible": False, "feet_visible": False, "enough_frames": False, "movement_detected": False},
        )

    # Validate or perform Calibration
    if calibration is None:
        calibration = calibrate_ground_plane(
            None,
            reference_width_m=ref_width_m,
            reference_height_m=ref_height_m,
            corner_override=corner_override,
            demo_mode=demo_mode,
        )

    if not calibration.get("valid", False):
        reason = calibration.get("rejection_reason") or "Keep the reference object fully visible on the same ground plane and record again."
        raise LongJumpError(
            f"Calibration failed: {reason}",
            {
                "person_detected": True,
                "full_body_visible": True,
                "feet_visible": True,
                "enough_frames": True,
                "movement_detected": True,
                "calibration_valid": False,
            },
            {"calibration": calibration},
        )

    homography = calibration.get("homography")
    if homography is None:
        raise LongJumpError(
            "Calibration failed. Keep the reference object fully visible on the same ground plane and record again.",
            {
                "person_detected": True,
                "full_body_visible": True,
                "feet_visible": True,
                "enough_frames": True,
                "movement_detected": True,
                "calibration_valid": False,
            },
            {"calibration": calibration},
        )

    valid_frames = []
    missing_count = 0
    for idx, frame in enumerate(frames):
        if frame is None:
            missing_count += 1
            continue
        foot_y = _foot_y(frame)
        foot_x = _foot_x(frame)
        nose_y = frame.get("nose_y")
        if foot_y is None or foot_x is None or nose_y is None:
            missing_count += 1
            continue
        valid_frames.append((idx, foot_x, foot_y, nose_y))

    pose_steps = [
        abs(current[1] - previous[1])
        for previous, current in zip(valid_frames, valid_frames[1:])
    ]
    if pose_steps and max(pose_steps) > MAX_POSE_STEP_NORM:
        raise LongJumpError(
            "Pose trajectory contains an implausible frame-to-frame jump.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            {"reason_code": "POSE_TRAJECTORY_INCONSISTENT", "max_pose_step_norm": max(pose_steps)},
        )

    if len(valid_frames) < 5:
        raise LongJumpError(
            "Required landmarks are missing for too much of the jump.",
            {"person_detected": True, "full_body_visible": False, "feet_visible": False, "enough_frames": True, "movement_detected": False},
            {"missing_rate": 1.0},
        )

    # A missing interval can hide the contact transition; keep the result
    # rejectable rather than filling gaps with invented landmarks.
    if missing_count / max(len(frames), 1) > 0.20:
        raise LongJumpError(
            "Pose was lost for too long during the jump.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            {"missing_rate": missing_count / max(len(frames), 1)},
        )

    body_heights = [abs(float(nose_y) - float(foot_y)) for _, _, foot_y, nose_y in valid_frames]
    body_height_norm = float(np.median(body_heights)) if body_heights else 0.25
    if body_height_norm < 0.04:
        raise LongJumpError(
            "No clear athlete scale was visible for distance estimation.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            {"body_height_norm": body_height_norm},
        )

    foot_ys = [y for _, _, y, _ in valid_frames]
    baseline_y = float(np.percentile(foot_ys, 25))

    airborne = []
    prev_x = None
    for idx, (frame_idx, foot_x, foot_y, nose_y) in enumerate(valid_frames):
        foot_drop = float(foot_y) < baseline_y - 0.03
        body_height = abs(float(nose_y) - float(foot_y))
        body_lift = body_height < max(0.08, body_height_norm * 0.85)
        x_progress = 0.0 if prev_x is None else float(foot_x) - float(prev_x)
        prev_x = foot_x
        is_air = foot_drop or (body_lift and abs(x_progress) > 0.001)
        airborne.append(is_air)

    if not any(airborne):
        raise LongJumpError(
            "No clear takeoff/landing was found for this long jump attempt.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
        )

    candidates = []
    current_start = None
    for idx, is_air in enumerate(airborne):
        if is_air and current_start is None:
            current_start = idx
        elif not is_air and current_start is not None:
            if idx - current_start >= 3:
                # The first grounded frame after flight is the landing contact.
                candidates.append((current_start, idx))
            current_start = None
    if current_start is not None and len(airborne) - current_start >= 3:
        raise LongJumpError(
            "Landing was not visible after the airborne phase.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            {"reason_code": "LANDING_NOT_DETECTED"},
        )

    if not candidates:
        raise LongJumpError(
            "No clear takeoff/landing was found for this long jump attempt.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
        )

    # Ignore tracking segments that last longer than a plausible flight. A
    # long recording can contain walking or crouching that mimics lift.
    plausible_candidates = [
        candidate for candidate in candidates
        if 0.0 < (valid_frames[candidate[1]][0] - valid_frames[candidate[0]][0]) / max(float(fps), 1e-6) <= 2.5
    ]
    if not plausible_candidates:
        raise LongJumpError(
            "No plausible flight phase was found in the video.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            {"reason_code": "TAKEOFF_NOT_DETECTED"},
        )

    # Reject only when multiple plausible attempts have comparable evidence;
    # incidental short segments must not invalidate a longer recording.
    significant_candidates = [c for c in plausible_candidates if (c[1] - c[0]) >= 4]
    candidate_scores = []
    for seg_start, seg_end in significant_candidates:
        span = abs(valid_frames[seg_end][1] - valid_frames[seg_start][1])
        duration = (valid_frames[seg_end][0] - valid_frames[seg_start][0]) / max(float(fps), 1e-6)
        candidate_scores.append((span * 10.0 + duration * 2.0, (seg_start, seg_end)))
    candidate_scores.sort(reverse=True, key=lambda item: item[0])
    if len(candidate_scores) > 1:
        longest_duration = max(
            (valid_frames[end][0] - valid_frames[start][0]) / max(float(fps), 1e-6)
            for start, end in significant_candidates
        )
        second_duration = sorted(
            ((valid_frames[end][0] - valid_frames[start][0]) / max(float(fps), 1e-6) for start, end in significant_candidates),
            reverse=True,
        )[1]
        sustained_flight_dominates = longest_duration >= 0.25 and second_duration < 0.25
        if not sustained_flight_dominates and candidate_scores[0][0] < candidate_scores[1][0] * 2.0:
            raise LongJumpError(
                "Multiple jump attempts detected in video. Please upload a clip with one clear jump attempt.",
                {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
            )

    candidates = plausible_candidates
    best = None
    best_score = -1.0
    for seg_start, seg_end in candidates:
        start_real_idx = valid_frames[seg_start][0]
        end_real_idx = valid_frames[seg_end][0]
        start_x = valid_frames[seg_start][1]
        start_y = valid_frames[seg_start][2]
        end_x = valid_frames[seg_end][1]
        end_y = valid_frames[seg_end][2]

        forward_distance_px = abs(end_x - start_x)
        airborne_sec = (end_real_idx - start_real_idx) / float(fps)

        approach_start = max(0, seg_start - max(6, int(round(fps * 0.5))))
        approach_values = valid_frames[approach_start:seg_start]
        approach_xs = [x for _, x, _, _ in approach_values] if len(approach_values) >= 2 else [start_x]
        approach_span = max(max(approach_xs) - min(approach_xs), 0.05)

        score = forward_distance_px * 10.0 + airborne_sec * 2.0 + approach_span * 3.0
        candidate = {
            "seg_start": seg_start,
            "seg_end": seg_end,
            "start_real_idx": start_real_idx,
            "end_real_idx": end_real_idx,
            "start_x": start_x,
            "start_y": start_y,
            "end_x": end_x,
            "end_y": end_y,
            "forward_distance_px": forward_distance_px,
            "airborne_sec": airborne_sec,
            "approach_span": approach_span,
            "score": score,
        }
        if score > best_score:
            best_score = score
            best = candidate

    if best is None:
        raise LongJumpError(
            "No clear takeoff/landing was found for this long jump attempt.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": False},
        )

    start_real_idx = best["start_real_idx"]
    end_real_idx = best["end_real_idx"]
    takeoff_x = best["start_x"]
    takeoff_y = best["start_y"]
    landing_x = best["end_x"]
    landing_y = best["end_y"]
    forward_distance_px = best["forward_distance_px"]
    approach_span = best["approach_span"]
    airborne_sec = best["airborne_sec"]

    w_img, h_img = image_size
    # MediaPipe landmarks are image-normalized; map to pixels before homography.
    tx_px = float(takeoff_x) * float(w_img)
    ty_px = float(takeoff_y) * float(h_img)
    lx_px = float(landing_x) * float(w_img)
    ly_px = float(landing_y) * float(h_img)

    try:
        distance_raw, (t_gx, t_gy), (l_gx, l_gy) = ground_distance_m(
            homography, (tx_px, ty_px), (lx_px, ly_px)
        )
    except CalibrationError as e:
        raise LongJumpError(
            "Required ground-plane geometry is unavailable. Keep the reference object fully visible and record again.",
            {
                "person_detected": True,
                "full_body_visible": True,
                "feet_visible": False,
                "enough_frames": True,
                "movement_detected": True,
                "calibration_valid": False,
            },
            {"reason": str(e)},
        )

    # Horizontal Euclidean distance on the calibrated ground plane (meters).
    distance_m = round(float(distance_raw), 2)

    # Sanity check ground-plane distance & distance normalization
    if distance_m <= 0.0 or np.isnan(distance_m) or not np.isfinite(distance_m):
        raise LongJumpError(
            "Transformed jump distance is invalid.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": True},
            {"reason_code": "INVALID_GROUND_DISTANCE", "raw_ground_distance_m": distance_m},
        )

    if airborne_sec <= 0.0 or airborne_sec > 2.50:
        raise LongJumpError(
            "Geometry and flight timing are physically inconsistent.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": True},
            {"reason_code": "PHYSICS_INCONSISTENT", "flight_time_sec": airborne_sec, "distance_m": distance_m},
        )
    horizontal_speed_mps = distance_m / max(airborne_sec, 1e-6)
    # This permissive upper bound catches scale/timing failures without
    # rejecting unusually fast approach/landing motion in a perspective view.
    physics_warning = None
    if horizontal_speed_mps > 40.0 and not demo_mode:
        raise LongJumpError(
            "Geometry and flight timing are physically inconsistent.",
            {"person_detected": True, "full_body_visible": True, "feet_visible": True, "enough_frames": True, "movement_detected": True},
            {"reason_code": "PHYSICS_INCONSISTENT", "horizontal_speed_mps": horizontal_speed_mps, "distance_m": distance_m},
        )
    if horizontal_speed_mps > 40.0:
        physics_warning = (
            "Demo result only: the supplied reference dimensions produce an "
            f"implausible horizontal speed of {horizontal_speed_mps:.1f} m/s."
        )

    reproj_err = float(calibration.get("reprojection_error", 0.02))
    measurement_uncertainty_m = round(max(0.02, min(0.50, reproj_err * 1.5)), 2)

    calib_confidence = float(calibration.get("calibration_confidence", 90.0))
    pose_confidence = round(max(0.0, min(100.0, 100.0 * (1.0 - missing_count / max(len(frames), 1)))), 1)
    event_confidence = round(max(0.0, min(100.0, 55.0 + min(35.0, approach_span * 100.0) + (10.0 if 0.20 <= airborne_sec <= 1.20 else 0.0))), 1)
    measurement_confidence = round(float(min(calib_confidence, pose_confidence, event_confidence)), 1)

    quality_checks = {
        "person_detected": True,
        "full_body_visible": True,
        "feet_visible": True,
        "enough_frames": True,
        "movement_detected": True,
        "calibration_valid": True,
    }

    takeoff_quality = min(100.0, max(45.0, 72.0 + approach_span * 50.0))
    landing_quality = min(100.0, max(40.0, 68.0 + min(20.0, (0.55 - max(0.0, abs(airborne_sec - 0.45))) * 25.0)))
    technique_score = min(100.0, max(50.0, 65.0 + min(25.0, distance_m * 10.0) + min(10.0, approach_span * 20.0)))

    calib_summary = {
        "valid": True,
        "reference_width_m": float(calibration.get("reference_width_m", ref_width_m)),
        "reference_height_m": float(calibration.get("reference_height_m", ref_height_m)),
        "corner_points": calibration.get("corner_points", []),
        "reprojection_error": reproj_err,
        "detection_method": calibration.get("reference_detection_method", "homography"),
        "visible_ground_extent_m": calibration.get("visible_ground_extent_m"),
    }

    return {
        "distance_m": distance_m,
        "jump_distance_m": distance_m,
        "calibration_confidence": calib_confidence,
        "measurement_confidence": measurement_confidence,
        "measurement_uncertainty_m": measurement_uncertainty_m,
        "pose_confidence": pose_confidence,
        "event_detection_confidence": event_confidence,
        "calibration": calib_summary,
        "distance_px": round(float(forward_distance_px), 3),
        "calibration_required": False,
        "calibration_note": "Ground plane calibrated via homography using the user-dimensioned reference object. Ground extent is camera-visible and approximate.",
        "takeoff_frame": int(start_real_idx),
        "landing_frame": int(end_real_idx),
        "flight_time_sec": round(float(airborne_sec), 3),
        "airborne_frames": int(end_real_idx - start_real_idx),
        "airborne_sec": round(float(airborne_sec), 3),
        "fps": round(float(fps), 2),
        "total_frames": len(frames),
        "valid_pose_frames": len(valid_frames),
        "takeoff_quality": round(float(takeoff_quality), 1),
        "landing_quality": round(float(landing_quality), 1),
        "technique_score": round(float(technique_score), 1),
        "detection_confidence": measurement_confidence,
        "takeoff": {
            "frame": int(start_real_idx),
            "timestamp_sec": round(float(start_real_idx) / max(float(fps), 1e-6), 3),
            "ground_x_m": round(t_gx, 3),
            "ground_y_m": round(t_gy, 3),
        },
        "landing": {
            "frame": int(end_real_idx),
            "timestamp_sec": round(float(end_real_idx) / max(float(fps), 1e-6), 3),
            "ground_x_m": round(l_gx, 3),
            "ground_y_m": round(l_gy, 3),
            "mark_detected": False,
        },
        "landing_note": "Estimated using athlete landing position; no visible sand landing mark was detected.",
        "physics_warning": physics_warning,
        "quality_checks": quality_checks,
        "confidence": {
            "calibration": round(calib_confidence, 1),
            "pose": pose_confidence,
            "event_detection": event_confidence,
            "measurement": measurement_confidence,
        },
        "diagnostics": {
            "video": {"fps": round(float(fps), 2), "frame_count": len(frames), "duration_sec": round(len(frames) / max(float(fps), 1e-6), 3)},
            "pose": {"valid_frames": len(valid_frames), "total_frames": len(frames), "confidence": pose_confidence},
            "events": {"takeoff_frame": int(start_real_idx), "landing_frame": int(end_real_idx), "confidence": event_confidence},
            "measurement": {"distance_m": distance_m, "uncertainty_m": measurement_uncertainty_m, "confidence": measurement_confidence},
        },
        "details": {
            "distance_m": distance_m,
            "takeoff_ground_m": [round(t_gx, 3), round(t_gy, 3)],
            "landing_ground_m": [round(l_gx, 3), round(l_gy, 3)],
            "approach_span_norm": round(float(approach_span), 4),
            "airborne_sec": round(float(airborne_sec), 3),
            "takeoff_x": round(float(takeoff_x), 4),
            "landing_x": round(float(landing_x), 4),
        },
    }


def analyze_long_jump(
    video_path: str,
    ref_width_m: float = 1.0,
    ref_height_m: float = 0.5,
    corner_override: Optional[List[Tuple[float, float]]] = None,
    demo_mode: bool = False,
    calibration: Optional[Dict[str, Any]] = None,
) -> dict:
    history, fps, frame_count, calib_frames, image_size = _read_frame_history(video_path)

    if calibration is None:
        calibration = calibrate_from_frames(
            calib_frames,
            reference_width_m=ref_width_m,
            reference_height_m=ref_height_m,
            corner_override=corner_override,
            demo_mode=demo_mode,
        )

    if not calibration.get("valid", False):
        reason = calibration.get("rejection_reason") or "Keep the reference object fully visible on the same ground plane and record again."
        raise LongJumpError(
            f"Calibration failed. Keep the reference object fully visible on the same ground plane and record again. ({reason})",
            {
                "person_detected": True,
                "full_body_visible": True,
                "feet_visible": True,
                "enough_frames": True,
                "movement_detected": True,
                "calibration_valid": False,
            },
            {"calibration": calibration},
        )

    result = analyze_long_jump_from_landmark_history(
        history,
        fps=fps,
        image_size=image_size,
        calibration=calibration,
        ref_width_m=ref_width_m,
        ref_height_m=ref_height_m,
        corner_override=corner_override,
        demo_mode=demo_mode,
    )
    result["fps"] = round(float(fps), 2)
    result["total_frames"] = int(frame_count)
    result["frame_count"] = int(frame_count)
    result["diagnostic_csv"] = _write_long_jump_diagnostics(video_path, result, history)
    return result
