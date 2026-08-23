"""Physics helpers for vertical jump metrics.

Jump height from flight time (symmetric ballistic model):
    h = g × t² / 8
which is equivalent to 0.125 × g × t².

Takeoff velocity:
    v = g × t / 2
"""

from __future__ import annotations

from typing import Dict

G = 9.81  # m/s²
FORMULA = "h = g × t² / 8"


def jump_metrics_from_flight_time(hang_time_sec: float, g: float = G) -> Dict[str, float | str]:
    if hang_time_sec < 0:
        raise ValueError("Flight time cannot be negative.")
    height_m = 0.125 * g * (hang_time_sec ** 2)
    takeoff_velocity_mps = g * (hang_time_sec / 2.0)
    return {
        "jump_height_cm": round(height_m * 100, 2),
        "takeoff_velocity_mps": round(takeoff_velocity_mps, 3),
        "g_used": g,
        "formula": FORMULA,
    }


def calculate_vertical_jump(height_m: float) -> Dict[str, float]:
    """Legacy helper kept for compatibility."""
    return {"height_m": height_m, "power_index": height_m * 2.5}


def calculate_sprint_speed(distance_m: float, time_s: float) -> Dict[str, float]:
    if time_s <= 0:
        raise ValueError("time_s must be greater than zero")
    speed_mps = distance_m / time_s
    return {"distance_m": distance_m, "time_s": time_s, "speed_mps": speed_mps}
