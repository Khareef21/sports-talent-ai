import numpy as np
import pytest
import cv2

from app.core.long_jump_calibration import (
    calibrate_ground_plane,
    calibrate_two_images,
    transform_image_to_ground,
    CalibrationError,
    order_corners,
)


def _synthetic_image(corners):
    image = np.full((720, 1280, 3), 255, dtype=np.uint8)
    cv2.fillConvexPoly(image, np.asarray(corners, dtype=np.int32), (20, 20, 20))
    return image


def test_valid_reference_geometry():
    # Synthetic frame 1280x720 with rectangular marker at bottom center
    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)
    top_left = (440, 450)
    top_right = (840, 450)
    bottom_right = (840, 650)
    bottom_left = (440, 650)
    
    cv2.rectangle(frame, top_left, bottom_right, (0, 0, 0), -1)

    result = calibrate_ground_plane(
        frame,
        reference_width_m=1.0,
        reference_height_m=0.5,
        corner_override=[top_left, top_right, bottom_right, bottom_left],
    )

    assert result["valid"] is True
    assert result["calibration_confidence"] > 70.0
    assert result["reprojection_error"] < 0.05
    assert len(result["corner_points"]) == 4


def test_different_reference_dimensions():
    corners = [(400, 400), (800, 400), (800, 600), (400, 600)]
    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)

    dim_cases = [(1.0, 0.5), (2.0, 1.0), (0.8, 0.4)]
    for ref_w, ref_h in dim_cases:
        res = calibrate_ground_plane(
            frame,
            reference_width_m=ref_w,
            reference_height_m=ref_h,
            corner_override=corners,
        )
        assert res["valid"] is True
        assert res["reference_width_m"] == ref_w
        assert res["reference_height_m"] == ref_h


def test_perspective_distorted_reference():
    # Perspective trapezoid on ground plane
    distorted_corners = [(420, 450), (860, 450), (1000, 680), (280, 680)]
    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)

    res = calibrate_ground_plane(
        frame,
        reference_width_m=1.0,
        reference_height_m=0.5,
        corner_override=distorted_corners,
    )

    assert res["valid"] is True
    assert res["homography"] is not None
    assert res["reprojection_error"] < 0.05


def test_missing_reference():
    # Blank frame without corners or override, demo_mode=False
    blank_frame = np.full((720, 1280, 3), 255, dtype=np.uint8)
    res = calibrate_ground_plane(blank_frame, reference_width_m=1.0, reference_height_m=0.5, demo_mode=False)

    assert res["valid"] is False
    assert res["homography"] is None
    assert "not detected" in res["rejection_reason"].lower() or "fewer than 4" in res["rejection_reason"].lower()


def test_insufficient_corners():
    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)
    three_corners = [(400, 400), (800, 400), (800, 600)]

    res = calibrate_ground_plane(
        frame,
        reference_width_m=1.0,
        reference_height_m=0.5,
        corner_override=three_corners,
        demo_mode=False,
    )

    assert res["valid"] is False
    assert res["homography"] is None


def test_invalid_calibration():
    # Degenerate colinear points
    colinear_corners = [(100, 100), (200, 100), (300, 100), (400, 100)]
    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)

    res = calibrate_ground_plane(
        frame,
        reference_width_m=1.0,
        reference_height_m=0.5,
        corner_override=colinear_corners,
    )

    assert res["valid"] is False


def test_pixel_movement_converted_to_expected_ground_distance():
    # Define corners where 100 pixels along X = 1.0 meter on ground
    # Rectangular marker of 1.0m width x 0.5m height placed at pixels X: [300, 400], Y: [500, 600]
    top_left = (300.0, 500.0)
    top_right = (400.0, 500.0)
    bottom_right = (400.0, 600.0)
    bottom_left = (300.0, 600.0)

    frame = np.full((720, 1280, 3), 255, dtype=np.uint8)
    res = calibrate_ground_plane(
        frame,
        reference_width_m=1.0,
        reference_height_m=0.5,
        corner_override=[top_left, top_right, bottom_right, bottom_left],
    )

    assert res["valid"] is True
    H = res["homography"]

    # Takeoff foot at pixel (300, 500) -> Ground (0.0, 0.0)
    t_gx, t_gy = transform_image_to_ground(H, 300.0, 500.0)
    assert abs(t_gx - 0.0) < 1e-3
    assert abs(t_gy - 0.0) < 1e-3

    # Landing foot at pixel (600, 500) -> Ground (3.0, 0.0) -> 300 pixels movement = 3.0 meters
    l_gx, l_gy = transform_image_to_ground(H, 600.0, 500.0)
    assert abs(l_gx - 3.0) < 1e-3
    assert abs(l_gy - 0.0) < 1e-3

    ground_dist = np.sqrt((l_gx - t_gx)**2 + (l_gy - t_gy)**2)
    assert abs(ground_dist - 3.0) < 1e-3


@pytest.mark.parametrize("expected_distance_m", [1.0, 2.0, 2.5, 3.0, 4.0])
def test_two_image_calibration_reconstructs_known_perspective_distances(expected_distance_m):
    ground_corners = [(80, 420), (500, 420), (500, 650), (80, 650)]
    ground_image = _synthetic_image(ground_corners)
    reference_corners = [(420, 440), (860, 455), (1010, 680), (260, 650)]
    reference_image = _synthetic_image(reference_corners)
    calibration = calibrate_two_images(
        ground_image,
        reference_image,
        reference_corner_override=reference_corners,
    )
    assert calibration["valid"] is True
    takeoff = transform_image_to_ground(calibration["homography"], 420, 440)
    inverse_homography = np.linalg.inv(np.asarray(calibration["homography"], dtype=np.float64))
    target_ground = np.array([takeoff[0] + expected_distance_m, takeoff[1], 1.0])
    target_image = inverse_homography @ target_ground
    target_image /= target_image[2]
    landing = transform_image_to_ground(calibration["homography"], target_image[0], target_image[1])
    measured = np.hypot(landing[0] - takeoff[0], landing[1] - takeoff[1])
    absolute_error = abs(measured - expected_distance_m)
    percentage_error = absolute_error / expected_distance_m * 100
    assert absolute_error < 1e-6
    assert percentage_error < 1e-6


def test_two_image_calibration_rejects_missing_reference():
    ground_image = _synthetic_image([(80, 420), (500, 420), (500, 650), (80, 650)])
    reference_image = np.full((720, 1280, 3), 255, dtype=np.uint8)
    result = calibrate_two_images(ground_image, reference_image)
    assert result["valid"] is False
    assert result["reference_calibration"]["valid"] is False
