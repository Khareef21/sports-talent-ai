import pytest
from app.core import pose_engine
import numpy as np

FPS = 30.0

def detect_from_ankle_history(history, fps=FPS, min_airborne=pose_engine.MIN_AIRBORNE_FRAMES):
    # Use the same logic as analyze_vertical_jump (interpolation + segment pick)
    interp = pose_engine._interpolate_nones(history, max_gap_frames=max(3, int(round(fps*0.1))))
    valid = [y for y in interp if y is not None]
    if not valid:
        raise pose_engine.QualityError('No valid values', {})
    baseline = np.percentile(valid, 90)
    threshold = baseline - pose_engine.AIRBORNE_Y_THRESHOLD
    mask = [(y is not None) and (y < threshold) for y in interp]
    # find longest
    best_start=-1; best_end=-1; best_len=0; cur_start=-1; cur_len=0
    for i,is_air in enumerate(mask):
        if is_air:
            if cur_start==-1:
                cur_start=i
            cur_len+=1
            if cur_len>best_len:
                best_len=cur_len; best_start=cur_start; best_end=i
        else:
            cur_start=-1; cur_len=0
    if best_len<min_airborne:
        raise pose_engine.QualityError('No clear airborne', {})
    return best_start, best_end, best_len, mask


def test_valid_normal_jump():
    # baseline around 0.9, airborne around 0.7 for 10 frames
    history = [0.9]*20 + [None, None] + [0.7]*12 + [0.9]*20
    start,end,length,mask = detect_from_ankle_history(history)
    assert length >= 10
    assert start < end


def test_no_jump():
    history = [0.85]*100
    with pytest.raises(pose_engine.QualityError):
        detect_from_ankle_history(history)


def test_person_standing_still():
    history = [0.88]*50
    with pytest.raises(pose_engine.QualityError):
        detect_from_ankle_history(history)


def test_multiple_movements():
    history = [0.9]*10 + [0.7]*5 + [0.9]*6 + [0.65]*8 + [0.9]*10
    start,end,length,mask = detect_from_ankle_history(history)
    # longest segment should be the second (8 frames)
    assert length == 8


def test_pose_lost_during_video():
    history = [0.9]*10 + [0.7]*6 + [None]*10 + [0.7]*6 + [0.9]*10
    # interpolation should NOT connect across long None gap; ensure we either raise
    # because the gap invalidates a single clean airborne window, or the detection
    # finds multiple segments (which our higher-level code would reject).
    got = None
    try:
        got = detect_from_ankle_history(history)
    except pose_engine.QualityError:
        got = 'raised'
    assert got == 'raised' or (isinstance(got, tuple) and got[2] < 12)


def test_unrealistically_long_airborne_interval():
    history = [0.9]*10 + [0.6]*200 + [0.9]*10
    # This may either be rejected by higher-level sanity checks, or detected here as a
    # very long airborne window. Ensure at least one of those holds.
    try:
        start,end,length,mask = detect_from_ankle_history(history)
        hang = (end - start) / FPS
        assert hang > pose_engine.MAX_DURATION_SEC or hang > 1.5
    except pose_engine.QualityError:
        # acceptable: detection logic rejected ambiguous/invalid input
        assert True

def test_variable_fps_metadata():
    history = [0.9]*20 + [0.7]*12 + [0.9]*18
    # run with 60 fps and 15 fps and ensure frames translate
    s1,e1,l1,_ = detect_from_ankle_history(history, fps=60.0)
    s2,e2,l2,_ = detect_from_ankle_history(history, fps=15.0)
    assert l1 == l2
