import sys, json
sys.path.insert(0, r'C:\Users\NAZEER\Desktop\sports-talent-ai\server')
from app.core import pose_engine
from mediapipe import Image, ImageFormat
import numpy as np

video_path = r'C:\Users\NAZEER\Downloads\vertical_jump_5sec.mp4'
cap, fps, reported, duration = pose_engine._open_capture(video_path)
print('VIDEO FPS (reported):', fps, 'frame_count reported:', reported, 'duration:', duration)

landmarker = pose_engine._create_landmarker(pose_engine.RunningMode.VIDEO)
ankle_y_history = []
detection_flags = []
full_body_flags = []
ankle_vis_flags = []
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
        rgb = np.ascontiguousarray(frame[:, :, ::-1])
        mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)
        if not result.pose_landmarks:
            ankle_y_history.append(None)
            detection_flags.append(False)
            full_body_flags.append(False)
            ankle_vis_flags.append(False)
            continue
        pose = result.pose_landmarks[0]
        la = pose_engine._landmark_at(pose, pose_engine.PoseLandmark.LEFT_ANKLE)
        ra = pose_engine._landmark_at(pose, pose_engine.PoseLandmark.RIGHT_ANKLE)
        if la is None or ra is None:
            ankle_y_history.append(None)
            detection_flags.append(True)
            full_body_flags.append(False)
            ankle_vis_flags.append(False)
            continue
        ankles_visible = (pose_engine._visibility(la) > pose_engine.VISIBILITY_THRESHOLD and pose_engine._visibility(ra) > pose_engine.VISIBILITY_THRESHOLD)
        required_vis = all((lm := pose_engine._landmark_at(pose, idx)) is not None and pose_engine._visibility(lm) > pose_engine.VISIBILITY_THRESHOLD for idx in pose_engine.REQUIRED_LANDMARKS)
        ankle_y_history.append((la.y + ra.y)/2.0)
        detection_flags.append(True)
        full_body_flags.append(required_vis)
        ankle_vis_flags.append(ankles_visible)
finally:
    cap.release()
    landmarker.close()

print('Captured frames:', frame_count)
valid_ankles = [y for y in ankle_y_history if y is not None]
print('Valid ankle frames:', len(valid_ankles))

# Original interpolation implementation (pre-fix)
def original_interpolate(values):
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
            if prev_val is not None and next_val is not None:
                for j in range(i, next_i):
                    t = (j - prev_i) / (next_i - prev_i)
                    result[j] = prev_val + t * (next_val - prev_val)
            elif prev_val is not None:
                for j in range(i, next_i):
                    result[j] = prev_val
            elif next_val is not None:
                for j in range(i, next_i):
                    result[j] = next_val
            i = next_i
        else:
            i += 1
    return result

# Reproduce original detection results
old_interp = original_interpolate(ankle_y_history)
# compute ground baseline using old interp
vals = [y for y in old_interp if y is not None]
import math
if not vals:
    print('No valid values after old interpolation')
    sys.exit(1)

ground_baseline = np.percentile(vals, 90)
airborne_threshold = ground_baseline - pose_engine.AIRBORNE_Y_THRESHOLD
old_airborne_mask = [y is not None and (y < airborne_threshold) for y in old_interp]
# find longest contiguous
best_start=-1; best_end=-1; best_len=0; cur_start=-1; cur_len=0
for i,is_air in enumerate(old_airborne_mask):
    if is_air:
        if cur_start==-1:
            cur_start=i
        cur_len+=1
        if cur_len>best_len:
            best_len=cur_len; best_start=cur_start; best_end=i
    else:
        cur_start=-1; cur_len=0
print('Original method best_start, best_end, best_len:', best_start, best_end, best_len)
old_hang = best_len / fps
print('Original FPS:', fps, 'Original hang_time:', old_hang)

# Recompute with new method for comparison (uses pose_engine._interpolate_nones)
new_interp = pose_engine._interpolate_nones(ankle_y_history, max_gap_frames=max(3, int(round(fps*0.1))))
vals_new = [y for y in new_interp if y is not None]
ground_baseline_new = np.percentile(vals_new, 90)
airborne_threshold_new = ground_baseline_new - pose_engine.AIRBORNE_Y_THRESHOLD
new_airborne_mask = [(y is not None) and (y < airborne_threshold_new) for y in new_interp]
# find longest contiguous
best_start=-1; best_end=-1; best_len=0; cur_start=-1; cur_len=0
for i,is_air in enumerate(new_airborne_mask):
    if is_air:
        if cur_start==-1:
            cur_start=i
        cur_len+=1
        if cur_len>best_len:
            best_len=cur_len; best_start=cur_start; best_end=i
    else:
        cur_start=-1; cur_len=0
print('New method best_start, best_end, best_len:', best_start, best_end, best_len)
new_hang = (best_end - best_start) / float(fps) if best_start!=-1 else 0.0
print('New hang_time (frame-diff/fps):', new_hang)

# Save diagnostics CSV as produced by analyze_vertical_jump
try:
    diag_dir = pose_engine.os.path.abspath(pose_engine.os.path.join(pose_engine.os.path.dirname(__file__), '..', 'diagnostics'))
    pose_engine.os.makedirs(diag_dir, exist_ok=True)
    vid_name = pose_engine.os.path.splitext(pose_engine.os.path.basename(video_path))[0]
    csv_path = pose_engine.os.path.join(diag_dir, f"{vid_name}_ankle_trajectory_debug.csv")
    with open(csv_path, 'w', encoding='utf-8') as fh:
        fh.write('frame,raw_ankle_y,old_interp,interp_new,air_old,air_new\n')
        for i in range(frame_count):
            raw = '' if ankle_y_history[i] is None else f"{ankle_y_history[i]:.6f}"
            o = '' if old_interp[i] is None else f"{old_interp[i]:.6f}"
            n = '' if new_interp[i] is None else f"{new_interp[i]:.6f}"
            ao = 1 if (old_interp[i] is not None and old_interp[i] < airborne_threshold) else 0
            an = 1 if (new_interp[i] is not None and new_interp[i] < airborne_threshold_new) else 0
            fh.write(f"{i},{raw},{o},{n},{ao},{an}\n")
    print('Diagnostics CSV saved to', csv_path)
except Exception as e:
    print('Could not write diagnostics CSV:', e)

print('Done')
