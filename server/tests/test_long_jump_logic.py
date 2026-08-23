import os

import cv2
import numpy as np
import pytest

from mediapipe import Image, ImageFormat
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

from app.core.long_jump import LongJumpError, analyze_long_jump, analyze_long_jump_from_landmark_history


def make_frame(x_left, x_right, y_left=0.88, y_right=0.88, nose_y=0.22, hip_y=0.58):
    return {
        "left_foot_x": x_left,
        "right_foot_x": x_right,
        "left_foot_y": y_left,
        "right_foot_y": y_right,
        "left_ankle_x": x_left,
        "right_ankle_x": x_right,
        "left_ankle_y": y_left,
        "right_ankle_y": y_right,
        "nose_y": nose_y,
        "left_hip_y": hip_y,
        "right_hip_y": hip_y,
    }


def test_valid_long_jump():
    frames = []
    for i in range(16):
        x = 0.06 * i
        frames.append(make_frame(x, x + 0.12, y_left=0.89, y_right=0.89))
    for i in range(8):
        x = 0.9 + 0.10 * i
        frames.append(make_frame(x, x + 0.12, y_left=0.48, y_right=0.48, nose_y=0.18, hip_y=0.42))
    for i in range(10):
        x = 1.65 + 0.07 * i
        frames.append(make_frame(x, x + 0.12, y_left=0.87, y_right=0.87))

    result = analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)
    assert result["distance_m"] > 0
    assert result["calibration"]["valid"] is True
    assert result["takeoff_frame"] >= 0
    assert result["landing_frame"] > result["takeoff_frame"]


def test_no_jump():
    frames = [make_frame(0.1 + 0.01 * i, 0.22 + 0.01 * i) for i in range(30)]
    with pytest.raises(LongJumpError):
        analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)


def test_person_standing_still():
    frames = [make_frame(0.20, 0.32) for _ in range(30)]
    with pytest.raises(LongJumpError):
        analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)


def test_multiple_movements():
    frames = []
    for i in range(8):
        frames.append(make_frame(0.10 + 0.02 * i, 0.22 + 0.02 * i))
    for i in range(6):
        frames.append(make_frame(0.30 + 0.01 * i, 0.42 + 0.01 * i, y_left=0.50, y_right=0.50))
    for i in range(10):
        frames.append(make_frame(0.40 + 0.06 * i, 0.52 + 0.06 * i, y_left=0.90, y_right=0.90))
    for i in range(6):
        frames.append(make_frame(0.85 + 0.03 * i, 0.97 + 0.03 * i, y_left=0.52, y_right=0.52))
    for i in range(10):
        frames.append(make_frame(1.0 + 0.05 * i, 1.12 + 0.05 * i, y_left=0.88, y_right=0.88))

    with pytest.raises(LongJumpError):
        analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)


def test_pose_lost_during_video():
    frames = []
    for i in range(10):
        frames.append(make_frame(0.10 + 0.04 * i, 0.22 + 0.04 * i))
    for _ in range(8):
        frames.append(None)
    for i in range(10):
        frames.append(make_frame(0.80 + 0.06 * i, 0.92 + 0.06 * i, y_left=0.40, y_right=0.40, nose_y=0.15, hip_y=0.35))
    for i in range(8):
        frames.append(make_frame(1.2 + 0.04 * i, 1.32 + 0.04 * i, y_left=0.89, y_right=0.89))

    with pytest.raises(LongJumpError):
        analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)


def test_unrealistically_long_jump_distance():
    frames = []
    for i in range(10):
        frames.append(make_frame(0.1 + 0.05 * i, 0.22 + 0.05 * i))
    for i in range(7):
        frames.append(make_frame(2.1 + 0.90 * i, 2.22 + 0.90 * i, y_left=0.45, y_right=0.45, nose_y=0.10, hip_y=0.35))
    for i in range(12):
        frames.append(make_frame(8.5 + 0.05 * i, 8.62 + 0.05 * i, y_left=0.89, y_right=0.89))

    with pytest.raises(LongJumpError):
        analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)


def test_variable_fps_metadata():
    frames = []
    for i in range(10):
        frames.append(make_frame(0.05 * i, 0.12 + 0.05 * i))
    for i in range(8):
        frames.append(make_frame(0.55 + 0.08 * i, 0.67 + 0.08 * i, y_left=0.44, y_right=0.44, nose_y=0.14, hip_y=0.38))
    for i in range(12):
        frames.append(make_frame(1.15 + 0.06 * i, 1.27 + 0.06 * i, y_left=0.90, y_right=0.90))

    result_30 = analyze_long_jump_from_landmark_history(frames, fps=30.0, demo_mode=True)
    result_60 = analyze_long_jump_from_landmark_history(frames, fps=60.0, demo_mode=True)
    assert abs(result_30["distance_px"] - result_60["distance_px"]) < 0.8


def test_real_video_processing_pipeline(tmp_path):
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "models", "pose_landmarker_lite.task"))
    landmarker = PoseLandmarker.create_from_options(
        PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    )
    video_path = tmp_path / "long_jump_real_video.mp4"
    width, height = 1280, 720
    fps = 30.0
    writer = cv2.VideoWriter(str(video_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    assert writer.isOpened()

    def draw_athlete(frame, cx, cy, stride_phase=0.0):
        head_c = (cx, cy - 110)
        neck = (cx, cy - 80)
        shoulder_l = (cx - 42, cy - 50)
        shoulder_r = (cx + 42, cy - 50)
        hip_l = (cx - 28, cy + 22)
        hip_r = (cx + 28, cy + 22)
        hand_l = (cx - 92, cy - 20)
        hand_r = (cx + 92, cy - 20)
        knee_l = (cx - 26 - int(10 * stride_phase), cy + 88)
        knee_r = (cx + 26 + int(10 * stride_phase), cy + 88)
        ankle_l = (cx - 68 - int(14 * stride_phase), cy + 170)
        ankle_r = (cx + 68 + int(14 * stride_phase), cy + 170)

        cv2.ellipse(frame, head_c, (34, 40), 0, 0, 360, (30, 30, 30), -1)
        cv2.rectangle(frame, (cx - 58, cy - 78), (cx + 58, cy + 26), (75, 75, 75), -1)
        cv2.line(frame, neck, shoulder_l, (45, 45, 45), 12)
        cv2.line(frame, neck, shoulder_r, (45, 45, 45), 12)
        cv2.line(frame, shoulder_l, hand_l, (45, 45, 45), 12)
        cv2.line(frame, shoulder_r, hand_r, (45, 45, 45), 12)
        cv2.line(frame, shoulder_l, hip_l, (55, 55, 55), 14)
        cv2.line(frame, shoulder_r, hip_r, (55, 55, 55), 14)
        cv2.line(frame, hip_l, knee_l, (60, 60, 60), 14)
        cv2.line(frame, hip_r, knee_r, (60, 60, 60), 14)
        cv2.line(frame, knee_l, ankle_l, (60, 60, 60), 14)
        cv2.line(frame, knee_r, ankle_r, (60, 60, 60), 14)

    for frame_idx in range(90):
        frame = np.full((height, width, 3), 255, dtype=np.uint8)
        cv2.line(frame, (0, height - 80), (width, height - 80), (180, 180, 180), 2)
        cv2.rectangle(frame, (80, height - 200), (280, height - 100), (20, 20, 20), -1)
        x = width // 2 + int((frame_idx - 45) * 8)
        if frame_idx < 24:
            y = 530
            stride = 0.15
        elif frame_idx < 34:
            y = 500 + int((34 - frame_idx) * 8)
            stride = 0.35
        elif frame_idx < 52:
            y = 430
            stride = 0.75
        elif frame_idx < 68:
            y = 470 + int((68 - frame_idx) * 4)
            stride = 0.55
        else:
            y = 530
            stride = 0.9

        draw_athlete(frame, x, y, stride)
        writer.write(frame)
    writer.release()

    cap = cv2.VideoCapture(str(video_path))
    assert cap.isOpened()
    history = []
    frame_count = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_count += 1
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = Image(image_format=ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        ts = int(round((frame_count - 1) * 1000.0 / fps))
        result = landmarker.detect_for_video(mp_image, ts)
        if not result.pose_landmarks:
            history.append(None)
            continue
        pose = result.pose_landmarks[0]
        left_foot = pose[29] if len(pose) > 29 else None
        right_foot = pose[30] if len(pose) > 30 else None
        pose_frame = {
            "left_foot_x": getattr(left_foot, "x", None),
            "right_foot_x": getattr(right_foot, "x", None),
            "left_foot_y": getattr(left_foot, "y", None),
            "right_foot_y": getattr(right_foot, "y", None),
            "nose_y": getattr(pose[0], "y", None) if len(pose) > 0 else None,
        }
        history.append(pose_frame)
    cap.release()
    landmarker.close()

    valid_count = sum(1 for frame in history if frame is not None)
    assert valid_count > 0
    result = analyze_long_jump(str(video_path), demo_mode=True)
    assert result["fps"] > 0
    assert result["frame_count"] == frame_count
    assert result["valid_pose_frames"] > 0
    assert result["takeoff_frame"] >= 0
    assert result["landing_frame"] > result["takeoff_frame"]
    assert result["flight_time_sec"] > 0
    assert result["quality_checks"]["person_detected"]
    assert result["calibration"]["valid"] is True
    assert "diagnostic_csv" in result and os.path.exists(result["diagnostic_csv"])
