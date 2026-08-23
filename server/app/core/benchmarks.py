"""
Vertical jump benchmark lookup table for percentile estimation.

Values represent approximate vertical jump heights (cm) at each percentile
for different age/gender brackets, based on general youth sports science literature.

IMPORTANT: These are prototype benchmarks for contextual comparison only.
Production deployment requires validation against representative sports-science datasets.
"""

from typing import Optional

# Structure: {gender: {age_bracket: {percentile: jump_height_cm}}}
# Age brackets: "under_12", "12_14", "15_17", "18_25", "26_35", "36_plus"
BENCHMARKS = {
    "Male": {
        "under_12": {10: 15, 25: 22, 50: 29, 75: 36, 90: 43},
        "12_14":    {10: 22, 25: 30, 50: 38, 75: 46, 90: 54},
        "15_17":    {10: 30, 25: 38, 50: 46, 75: 55, 90: 63},
        "18_25":    {10: 35, 25: 44, 50: 52, 75: 61, 90: 70},
        "26_35":    {10: 30, 25: 40, 50: 49, 75: 58, 90: 67},
        "36_plus":  {10: 22, 25: 32, 50: 41, 75: 50, 90: 59},
    },
    "Female": {
        "under_12": {10: 12, 25: 18, 50: 24, 75: 30, 90: 37},
        "12_14":    {10: 17, 25: 24, 50: 30, 75: 37, 90: 44},
        "15_17":    {10: 22, 25: 29, 50: 35, 75: 42, 90: 49},
        "18_25":    {10: 25, 25: 32, 50: 39, 75: 46, 90: 54},
        "26_35":    {10: 22, 25: 30, 50: 37, 75: 44, 90: 51},
        "36_plus":  {10: 17, 25: 24, 50: 31, 75: 38, 90: 45},
    },
}

def _get_age_bracket(age: int) -> str:
    if age < 12:
        return "under_12"
    elif age < 15:
        return "12_14"
    elif age < 18:
        return "15_17"
    elif age < 26:
        return "18_25"
    elif age < 36:
        return "26_35"
    else:
        return "36_plus"

def _normalize_gender(gender: str) -> str:
    g = gender.strip().lower()
    if g in ("male", "m", "boy", "man"):
        return "Male"
    elif g in ("female", "f", "girl", "woman"):
        return "Female"
    return "Male"  # default fallback

def calculate_percentile(jump_height_cm: float, age: int, gender: str) -> int:
    """
    Returns estimated percentile (0-100) for a given jump height, age, and gender.
    Uses linear interpolation between benchmark anchors.
    """
    gender_key = _normalize_gender(gender)
    bracket = _get_age_bracket(age)

    table = BENCHMARKS.get(gender_key, BENCHMARKS["Male"]).get(bracket, {})
    percentiles = sorted(table.keys())  # [10, 25, 50, 75, 90]
    heights = [table[p] for p in percentiles]

    if jump_height_cm <= heights[0]:
        # Below 10th percentile
        # Extrapolate down to 0
        if heights[0] > 0:
            ratio = jump_height_cm / heights[0]
            return max(1, round(percentiles[0] * ratio))
        return 1

    if jump_height_cm >= heights[-1]:
        # Above 90th percentile
        extra = jump_height_cm - heights[-1]
        range_top = heights[-1] - heights[-2]
        if range_top > 0:
            bonus = (extra / range_top) * (100 - percentiles[-1])
            return min(99, round(percentiles[-1] + bonus))
        return 95

    # Linear interpolation between anchors
    for i in range(len(heights) - 1):
        if heights[i] <= jump_height_cm <= heights[i + 1]:
            t = (jump_height_cm - heights[i]) / (heights[i + 1] - heights[i])
            interp = percentiles[i] + t * (percentiles[i + 1] - percentiles[i])
            return round(interp)

    return 50  # fallback

def get_talent_tier(percentile: int) -> str:
    if percentile >= 90:
        return "Elite Potential"
    elif percentile >= 75:
        return "High Performance"
    elif percentile >= 50:
        return "Above Average"
    elif percentile >= 25:
        return "Developing"
    else:
        return "Foundational"

def get_benchmark_description(percentile: int, jump_height_cm: float) -> str:
    if percentile >= 90:
        return f"Exceptional explosive power at {jump_height_cm:.1f} cm. Top 10% of peers."
    elif percentile >= 75:
        return f"Strong explosive performance at {jump_height_cm:.1f} cm. Top 25% of peers."
    elif percentile >= 50:
        return f"Above-average explosive performance at {jump_height_cm:.1f} cm."
    elif percentile >= 25:
        return f"Developing explosive capacity at {jump_height_cm:.1f} cm. Room for improvement with training."
    else:
        return f"Early-stage explosive development at {jump_height_cm:.1f} cm. Consistent training recommended."
