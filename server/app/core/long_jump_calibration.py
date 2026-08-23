"""
Long Jump V1 Reference-Object Calibration Module.

Establishes an image-to-ground homography using a known rectangular
reference marker that sits on the same ground plane as the athlete.

Never uses a fixed pixel-to-meter scale. Scale comes only from the
user-supplied reference width/height and the detected image corners.
"""

from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np


MIN_CALIBRATION_CONFIDENCE = 50.0
MIN_QUAD_AREA_PX = 200.0
MIN_INTERNAL_ANGLE_DEG = 18.0
MAX_HOMOGRAPHY_CONDITION = 1e8
REFERENCE_OBJECT_WIDTH_M = 1.0
REFERENCE_OBJECT_LENGTH_M = 0.5


class CalibrationError(ValueError):
    """Raised when scene calibration fails or is invalid."""


def _invalid_combined(reason: str, dimensions: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    return {
        "valid": False,
        "calibration_valid": False,
        "ground_calibration": {
            "valid": False,
            "dimensions": dimensions or {},
            "detected_points": [],
            "confidence": 0.0,
            "rejection_reason": reason,
        },
        "reference_calibration": {"valid": False, "detected_points": [], "confidence": 0.0},
        "homography": None,
        "calibration_confidence": 0.0,
        "rejection_reason": reason,
    }


def calibrate_two_images(
    ground_image: np.ndarray,
    reference_image: np.ndarray,
    demo_mode: bool = False,
    reference_corner_override: Optional[Sequence[Tuple[float, float]]] = None,
) -> Dict[str, Any]:
    """Create a metric ground plane from two images and a centralized marker size.

    Image A is scene validation only. Image B owns the image-to-ground
    homography because it contains the known marker on the pitch ground plane.
    No pitch size is inferred when the image does not contain enough geometry.
    """
    dimensions: Dict[str, float] = {}
    if ground_image is None or getattr(ground_image, "size", 0) == 0:
        return _invalid_combined("Ground dimension image could not be read.", dimensions)
    if reference_image is None or getattr(reference_image, "size", 0) == 0:
        return _invalid_combined("Pitch reference image could not be read.", dimensions)

    # Image A validates visible scene geometry only; it is not used as a
    # metric reference and therefore may use a detected ground contour.
    ground_points_detected = detect_rectangular_contour(ground_image)
    if ground_points_detected is None:
        return _invalid_combined("CALIBRATION_UNCERTAIN: Image 1 has no detectable ground/reference geometry.", dimensions)
    ground_points = ground_points_detected.tolist()
    reference = calibrate_ground_plane(
        reference_image,
        reference_width_m=REFERENCE_OBJECT_WIDTH_M,
        reference_height_m=REFERENCE_OBJECT_LENGTH_M,
        corner_override=reference_corner_override,
        demo_mode=demo_mode,
    )
    if not reference.get("valid"):
        result = _invalid_combined(reference.get("rejection_reason") or "Reference corners are unreliable.", dimensions)
        result["ground_calibration"] = {
            "valid": True,
            "dimensions": dimensions,
            "detected_points": ground_points,
            "confidence": 85.0,
            "rejection_reason": None,
        }
        result["reference_calibration"] = {
            "valid": False,
            "detected_points": reference.get("corner_points", []),
            "confidence": reference.get("calibration_confidence", 0.0),
        }
        return result

    ground_confidence = 85.0
    reference_confidence = float(reference.get("calibration_confidence", 0.0))
    combined_confidence = round(min(ground_confidence, reference_confidence), 1)
    if combined_confidence < MIN_CALIBRATION_CONFIDENCE:
        return _invalid_combined("Combined calibration confidence is below the required threshold.", dimensions)

    return {
        "valid": True,
        "calibration_valid": True,
        "ground_calibration": {
            "valid": True,
            "dimensions": None,
            "detected_points": ground_points,
            "confidence": ground_confidence,
            "rejection_reason": "Image-derived scene geometry; physical pitch dimensions were not assumed.",
        },
        "reference_calibration": {
            "valid": True,
            "detected_points": reference["corner_points"],
            "confidence": reference_confidence,
            "dimensions": {"width_m": REFERENCE_OBJECT_WIDTH_M, "length_m": REFERENCE_OBJECT_LENGTH_M},
        },
        "homography": reference["homography"],
        "corner_points": reference["corner_points"],
        "reference_width_m": REFERENCE_OBJECT_WIDTH_M,
        "reference_height_m": REFERENCE_OBJECT_LENGTH_M,
        "reference_id": None,
        "reprojection_error": reference["reprojection_error"],
        "calibration_confidence": combined_confidence,
        "pitch_geometry": {
            "detected": False,
            "width_m": None,
            "length_m": None,
            "rejection_reason": "Pitch boundaries were not independently recoverable from the calibration image.",
        },
        "rejection_reason": None,
    }


def _invalid(
    reference_width_m: float,
    reference_height_m: float,
    reason: str,
    corner_points: Optional[list] = None,
    homography: Any = None,
    reprojection_error: float = 999.0,
) -> Dict[str, Any]:
    return {
        "valid": False,
        "calibration_valid": False,
        "homography": homography,
        "reference_width_m": float(reference_width_m),
        "reference_height_m": float(reference_height_m),
        "corner_points": corner_points or [],
        "reprojection_error": float(reprojection_error),
        "calibration_confidence": 0.0,
        "rejection_reason": reason,
    }


def order_corners(pts: np.ndarray) -> np.ndarray:
    """Order 4 points as top-left, top-right, bottom-right, bottom-left."""
    pts = np.asarray(pts, dtype=np.float32).reshape((4, 2))
    rect = np.zeros((4, 2), dtype=np.float32)

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _quad_area(pts: np.ndarray) -> float:
    pts = np.asarray(pts, dtype=np.float64).reshape((4, 2))
    x, y = pts[:, 0], pts[:, 1]
    return float(abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) * 0.5)


def _min_internal_angle_deg(pts: np.ndarray) -> float:
    pts = np.asarray(pts, dtype=np.float64).reshape((4, 2))
    angles = []
    for i in range(4):
        prev_pt = pts[(i - 1) % 4]
        cur = pts[i]
        next_pt = pts[(i + 1) % 4]
        v1 = prev_pt - cur
        v2 = next_pt - cur
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 < 1e-6 or n2 < 1e-6:
            return 0.0
        cosang = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
        angles.append(float(np.degrees(np.arccos(cosang))))
    return float(min(angles)) if angles else 0.0


def _edge_lengths(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=np.float64).reshape((4, 2))
    return np.array([np.linalg.norm(pts[(i + 1) % 4] - pts[i]) for i in range(4)])


def detect_aruco_corners(image: np.ndarray) -> Optional[np.ndarray]:
    """Detect ArUco marker corners if OpenCV contrib ArUco is available."""
    if image is None or not hasattr(cv2, "aruco"):
        return None

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        dict_ids = [
            cv2.aruco.DICT_4X4_50,
            cv2.aruco.DICT_5X5_50,
            cv2.aruco.DICT_6X6_250,
            cv2.aruco.DICT_ARUCO_ORIGINAL,
        ]

        for dict_id in dict_ids:
            try:
                aruco_dict = cv2.aruco.getPredefinedDictionary(dict_id)
                if hasattr(cv2.aruco, "ArucoDetector"):
                    params = cv2.aruco.DetectorParameters()
                    detector = cv2.aruco.ArucoDetector(aruco_dict, params)
                    corners, ids, _ = detector.detectMarkers(gray)
                else:
                    params = cv2.aruco.DetectorParameters_create()
                    corners, ids, _ = cv2.aruco.detectMarkers(gray, aruco_dict, parameters=params)

                if ids is not None and len(corners) > 0:
                    return order_corners(corners[0].reshape((4, 2)))
            except Exception:
                continue
    except Exception:
        return None

    return None


def detect_aruco_reference(image: np.ndarray) -> Optional[Dict[str, Any]]:
    """Detect the first configured marker and return its identity and corners."""
    if image is None or not hasattr(cv2, "aruco"):
        return None
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        dictionaries = [
            cv2.aruco.DICT_4X4_50,
            cv2.aruco.DICT_5X5_50,
            cv2.aruco.DICT_6X6_250,
            cv2.aruco.DICT_ARUCO_ORIGINAL,
        ]
        for dictionary_id in dictionaries:
            aruco_dictionary = cv2.aruco.getPredefinedDictionary(dictionary_id)
            if hasattr(cv2.aruco, "ArucoDetector"):
                detector = cv2.aruco.ArucoDetector(aruco_dictionary, cv2.aruco.DetectorParameters())
                corners, ids, _ = detector.detectMarkers(gray)
            else:
                corners, ids, _ = cv2.aruco.detectMarkers(gray, aruco_dictionary)
            if ids is not None and corners:
                return {
                    "marker_id": int(ids[0][0]),
                    "corners": order_corners(corners[0].reshape((4, 2))),
                    "confidence": 90.0,
                }
    except Exception:
        return None
    return None


def _collect_quads_from_binary(binary: np.ndarray, img_area: float) -> List[np.ndarray]:
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    quads = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.0015 * img_area or area > 0.75 * img_area:
            continue
        peri = cv2.arcLength(cnt, True)
        for eps in (0.02, 0.03, 0.04):
            approx = cv2.approxPolyDP(cnt, eps * peri, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                quads.append(approx.reshape((4, 2)).astype(np.float32))
                break
    return quads


def detect_rectangular_contour(image: np.ndarray) -> Optional[np.ndarray]:
    """Fallback: largest high-contrast convex 4-corner contour on the frame."""
    if image is None or getattr(image, "size", 0) == 0:
        return None

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    img_area = float(gray.shape[0] * gray.shape[1])

    adaptive = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
    )
    _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    edges = cv2.Canny(blurred, 30, 150)
    _, inverted_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    best_rect = None
    max_area = 0.0
    for binary in (adaptive, otsu, inverted_otsu, edges):
        for quad in _collect_quads_from_binary(binary, img_area):
            ordered = order_corners(quad)
            area = _quad_area(ordered)
            if area > max_area and _min_internal_angle_deg(ordered) >= MIN_INTERNAL_ANGLE_DEG:
                max_area = area
                best_rect = ordered

    return best_rect


def detect_reference_corners(image: np.ndarray) -> Optional[np.ndarray]:
    """Detect ArUco first, then a validated user-dimensioned quadrilateral."""
    corners = detect_aruco_corners(image)
    return corners if corners is not None else detect_rectangular_contour(image)


def detect_reference(image: np.ndarray) -> Optional[Dict[str, Any]]:
    """Return configured marker metadata and ordered corners when detectable."""
    reference = detect_aruco_reference(image)
    if reference is None:
        return None
    return {
        "marker_id": reference["marker_id"],
        "corners": reference["corners"].tolist(),
        "width_m": REFERENCE_OBJECT_WIDTH_M,
        "height_m": REFERENCE_OBJECT_LENGTH_M,
        "confidence": reference["confidence"],
    }


def generate_demo_corners(image_width: int, image_height: int) -> np.ndarray:
    """
    Synthetic ground-plane trapezoid for development/demo calibration mode.
    Used only when demo_mode=True and no real reference is detected.
    """
    w = float(image_width)
    h = float(image_height)
    corners = np.array(
        [
            [w * 0.35, h * 0.65],
            [w * 0.65, h * 0.65],
            [w * 0.75, h * 0.85],
            [w * 0.25, h * 0.85],
        ],
        dtype=np.float32,
    )
    return order_corners(corners)


def _dst_reference_points(reference_width_m: float, reference_height_m: float) -> np.ndarray:
    return np.array(
        [
            [0.0, 0.0],
            [float(reference_width_m), 0.0],
            [float(reference_width_m), float(reference_height_m)],
            [0.0, float(reference_height_m)],
        ],
        dtype=np.float32,
    )


def calibrate_ground_plane(
    frame: np.ndarray,
    reference_width_m: float = 1.0,
    reference_height_m: float = 0.5,
    corner_override: Optional[Sequence[Tuple[float, float]]] = None,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """
    Image → ground-plane homography from a known rectangular reference.

    Real-world destination (meters), ordered TL, TR, BR, BL:
    [(0, 0), (W, 0), (W, H), (0, H)]
    """
    if reference_width_m <= 0 or reference_height_m <= 0:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Invalid reference dimensions provided (must be positive).",
        )

    if frame is not None and hasattr(frame, "shape") and len(frame.shape) >= 2:
        h_img, w_img = int(frame.shape[0]), int(frame.shape[1])
    else:
        h_img, w_img = 720, 1280

    corners = None
    if corner_override is not None and len(corner_override) == 4:
        corners = order_corners(np.array(corner_override, dtype=np.float32))
    elif demo_mode:
        # Demo fixtures have no guaranteed physical marker; use the same
        # deterministic synthetic plane instead of calibrating on a random
        # high-contrast object in the sample video.
        corners = generate_demo_corners(w_img, h_img)
    elif frame is not None and getattr(frame, "size", 0) > 0:
        corners = detect_reference_corners(frame)

    if corners is None or len(corners) != 4:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Reference object not detected or fewer than 4 reliable corners found.",
        )

    src_pts = corners.astype(np.float32)
    area = _quad_area(src_pts)
    if area < MIN_QUAD_AREA_PX:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Reference is severely distorted/occluded (degenerate corner geometry).",
            corner_points=src_pts.tolist(),
        )

    min_angle = _min_internal_angle_deg(src_pts)
    if min_angle < MIN_INTERNAL_ANGLE_DEG:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Reference is severely distorted/occluded (unstable corner angles).",
            corner_points=src_pts.tolist(),
        )

    lengths = _edge_lengths(src_pts)
    if float(np.min(lengths)) < 8.0:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Fewer than 4 reliable corners were detected.",
            corner_points=src_pts.tolist(),
        )

    dst_pts = _dst_reference_points(reference_width_m, reference_height_m)

    try:
        H, _status = cv2.findHomography(src_pts, dst_pts, 0)
        if H is None:
            H = cv2.getPerspectiveTransform(src_pts, dst_pts)
    except Exception as exc:
        return _invalid(
            reference_width_m,
            reference_height_m,
            f"Homography calculation failed: {exc}",
            corner_points=src_pts.tolist(),
        )

    if H is None or not np.all(np.isfinite(H)):
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Homography matrix is singular or unstable.",
            corner_points=src_pts.tolist(),
        )

    det = float(np.linalg.det(H))
    cond = float(np.linalg.cond(H))
    if np.isnan(det) or abs(det) < 1e-12 or not np.isfinite(cond) or cond > MAX_HOMOGRAPHY_CONDITION:
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Homography matrix is singular or unstable.",
            corner_points=src_pts.tolist(),
        )

    src_h = np.hstack([src_pts, np.ones((4, 1), dtype=np.float32)])
    reprojected = (H @ src_h.T).T
    w = reprojected[:, 2:3]
    if np.any(np.abs(w) < 1e-9):
        return _invalid(
            reference_width_m,
            reference_height_m,
            "Homography matrix is singular or unstable.",
            corner_points=src_pts.tolist(),
        )
    reprojected_xy = reprojected[:, :2] / w
    mean_reproj_error_m = float(np.mean(np.linalg.norm(reprojected_xy - dst_pts, axis=1)))

    max_allowed_error = max(0.15 * max(reference_width_m, reference_height_m), 0.05)
    if mean_reproj_error_m > max_allowed_error:
        return _invalid(
            reference_width_m,
            reference_height_m,
            f"High calibration reprojection error ({mean_reproj_error_m:.3f}m > {max_allowed_error:.3f}m).",
            corner_points=src_pts.tolist(),
            homography=H.tolist(),
            reprojection_error=round(mean_reproj_error_m, 4),
        )

    error_ratio = min(1.0, mean_reproj_error_m / max_allowed_error)
    confidence = round(max(50.0, 98.0 - (error_ratio * 35.0)), 1)
    if confidence < MIN_CALIBRATION_CONFIDENCE:
        return _invalid(
            reference_width_m,
            reference_height_m,
            f"Calibration confidence is below threshold ({confidence:.1f}% < {MIN_CALIBRATION_CONFIDENCE:.1f}%).",
            corner_points=src_pts.tolist(),
            homography=H.tolist(),
            reprojection_error=round(mean_reproj_error_m, 4),
        )

    image_corners = np.array(
        [[0.0, 0.0], [float(w_img - 1), 0.0], [float(w_img - 1), float(h_img - 1)], [0.0, float(h_img - 1)]],
        dtype=np.float32,
    )
    visible_ground_corners = [transform_image_to_ground(H, float(point[0]), float(point[1])) for point in image_corners]
    visible_ground_width_m = float(np.linalg.norm(np.asarray(visible_ground_corners[1]) - np.asarray(visible_ground_corners[0])))
    visible_ground_length_m = float(np.linalg.norm(np.asarray(visible_ground_corners[3]) - np.asarray(visible_ground_corners[0])))

    return {
        "valid": True,
        "calibration_valid": True,
        "homography": H.tolist(),
        "reference_width_m": float(reference_width_m),
        "reference_height_m": float(reference_height_m),
        "corner_points": src_pts.tolist(),
        "reprojection_error": round(mean_reproj_error_m, 4),
        "reference_detection_method": "aruco_or_validated_quadrilateral",
        "visible_ground_extent_m": {
            "width_m": round(visible_ground_width_m, 3),
            "length_m": round(visible_ground_length_m, 3),
            "note": "Approximate calibrated camera-visible extent, not the full pitch dimension.",
        },
        "calibration_confidence": confidence,
        "rejection_reason": None,
        "reference_id": None,
    }


def calibrate_from_frames(
    frames: Sequence[np.ndarray],
    reference_width_m: float = 1.0,
    reference_height_m: float = 0.5,
    corner_override: Optional[Sequence[Tuple[float, float]]] = None,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """Try calibration on early video frames; last failure is returned if none succeed."""
    if demo_mode:
        first_frame = next((frame for frame in frames if frame is not None), None) if frames else None
        return calibrate_ground_plane(
            first_frame,
            reference_width_m=reference_width_m,
            reference_height_m=reference_height_m,
            corner_override=corner_override,
            demo_mode=True,
        )

    last = _invalid(
        reference_width_m,
        reference_height_m,
        "Reference object not detected or fewer than 4 reliable corners found.",
    )
    candidates = list(frames) if frames else [None]
    for frame in candidates:
        result = calibrate_ground_plane(
            frame,
            reference_width_m=reference_width_m,
            reference_height_m=reference_height_m,
            corner_override=corner_override,
            demo_mode=False,
        )
        if result.get("valid"):
            return result
        last = result

    return last


def transform_image_to_ground(homography: Any, image_x: float, image_y: float) -> Tuple[float, float]:
    """Map image pixels (x, y) through H to ground-plane meters (X, Y)."""
    if homography is None:
        raise CalibrationError("Cannot transform point without valid homography matrix.")

    H = np.asarray(homography, dtype=np.float64)
    pt = np.array([float(image_x), float(image_y), 1.0], dtype=np.float64)
    ground_homo = H @ pt
    if abs(ground_homo[2]) < 1e-9:
        raise CalibrationError("Transformed point projection division by zero (point at infinity).")

    gx = ground_homo[0] / ground_homo[2]
    gy = ground_homo[1] / ground_homo[2]
    if not (np.isfinite(gx) and np.isfinite(gy)):
        raise CalibrationError("Required ground-plane geometry is unavailable.")
    return float(gx), float(gy)


def ground_distance_m(
    homography: Any,
    takeoff_xy_px: Tuple[float, float],
    landing_xy_px: Tuple[float, float],
):
    """
    Horizontal ground-plane distance:

        d = sqrt( (X_land - X_takeoff)^2 + (Y_land - Y_takeoff)^2 )

    where (X, Y) = H @ (x_px, y_px, 1) after homogeneous divide.
    """
    t_gx, t_gy = transform_image_to_ground(homography, takeoff_xy_px[0], takeoff_xy_px[1])
    l_gx, l_gy = transform_image_to_ground(homography, landing_xy_px[0], landing_xy_px[1])
    return float(np.sqrt((l_gx - t_gx) ** 2 + (l_gy - t_gy) ** 2)), (t_gx, t_gy), (l_gx, l_gy)
