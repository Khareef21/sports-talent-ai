import os
import json
from typing import Optional

def generate_coach_report(athlete_data: dict, metrics: dict, percentile: int) -> dict:
    """
    Generates a coach report using Gemini.
    Falls back gracefully if no API key is configured.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
    jump_height_cm = metrics.get("jump_height_cm", 0)
    hang_time_sec = metrics.get("hang_time_sec", 0)

    if not api_key or api_key.startswith("your-"):
        return _fallback_report(athlete_data, metrics, percentile)

    try:
        from google import genai
        from google.genai import types
        from pydantic import BaseModel, Field

        class CoachReportSchema(BaseModel):
            coach_summary: str = Field(
                description="2-3 sentence clear summary of the athletic performance observed, written encouragingly. Do NOT claim to be from SAI."
            )
            improvement_tips: list[str] = Field(
                description="Exactly 3 actionable biomechanical tips to improve vertical jump performance."
            )

        client = genai.Client(api_key=api_key)

        prompt = f"""
You are a sports performance analyst helping assess youth athletes using smartphone-based jump analysis.

ATHLETE:
- Name: {athlete_data.get('full_name', 'Athlete')}
- Age: {athlete_data.get('age', 'N/A')}
- Gender: {athlete_data.get('gender', 'N/A')}

PHYSICS-MEASURED METRICS:
- Jump Height: {jump_height_cm:.1f} cm (measured via flight-time physics: h = g×t²/8)
- Flight Time: {hang_time_sec:.3f} seconds
- Peer Percentile: ~{percentile}th (prototype benchmark, not official standard)

Please write:
1. A 2-3 sentence coach summary of this performance — encouraging, honest, and specific to the jump height measured.
2. Exactly 3 actionable biomechanical tips to improve vertical jump performance for this athlete's profile.

Be honest. Do NOT fabricate scores or claim the athlete is elite based on unverified data.
"""

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CoachReportSchema,
                temperature=0.3,
            ),
        )

        result = json.loads(response.text)
        return {
            "coach_summary": result.get("coach_summary", ""),
            "improvement_tips": result.get("improvement_tips", []),
            "ai_generated": True,
        }

    except Exception as e:
        # Graceful fallback — do not crash the whole assessment
        print(f"Gemini API error: {e}")
        return _fallback_report(athlete_data, metrics, percentile)


def _fallback_report(athlete_data: dict, metrics: dict, percentile: int) -> dict:
    """Deterministic fallback when Gemini is unavailable."""
    jump_height_cm = metrics.get("jump_height_cm", 0)
    name = athlete_data.get("full_name", "The athlete")

    if percentile >= 75:
        summary = (
            f"{name} demonstrated strong explosive lower-body power with a {jump_height_cm:.1f} cm vertical jump, "
            f"placing in the {percentile}th percentile. "
            f"Consistent training can push this to an elite level."
        )
    elif percentile >= 50:
        summary = (
            f"{name} showed above-average explosive capacity at {jump_height_cm:.1f} cm, "
            f"placing in the {percentile}th percentile. "
            f"Focused plyometric training should yield significant gains."
        )
    else:
        summary = (
            f"{name} recorded a vertical jump of {jump_height_cm:.1f} cm, "
            f"placing in the {percentile}th percentile. "
            f"With consistent training focusing on strength and explosiveness, there is clear room for improvement."
        )

    tips = [
        "Focus on triple extension (ankle, knee, hip) — drive powerfully through all three joints simultaneously at takeoff.",
        "Practice box jumps and depth jumps 2–3 times per week to develop reactive strength in the stretch-shortening cycle.",
        "Work on arm swing timing — coordinate a strong upward arm drive with your jump to add 5–10% more height.",
    ]

    return {
        "coach_summary": summary,
        "improvement_tips": tips,
        "ai_generated": False,
    }