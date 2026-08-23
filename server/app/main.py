import os
import shutil
import tempfile
from pathlib import Path

import cv2

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Accept either env name; keep GOOGLE_API_KEY as a fallback for Gemini.
if not os.environ.get("GEMINI_API_KEY") and os.environ.get("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]

from app.core.pose_engine import QualityError, analyze_vertical_jump, inspect_video_quality
from app.core.long_jump import LongJumpError, analyze_long_jump
from app.core.long_jump_calibration import calibrate_two_images
from app.core.gemini_eval import generate_coach_report
from app.core.benchmarks import calculate_percentile, get_talent_tier, get_benchmark_description

app = FastAPI(title="Sports Talent AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase = None
if SUPABASE_URL and not SUPABASE_URL.startswith("https://your-"):
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        pass

ALLOWED_VIDEO_EXT = {".mp4", ".mov", ".webm"}


def _save_upload(video: UploadFile) -> str:
    filename = (video.filename or "jump.webm").lower()
    suffix = Path(filename).suffix or ".webm"
    content_type = (video.content_type or "").lower()

    if suffix not in ALLOWED_VIDEO_EXT and content_type not in {
        "video/mp4",
        "video/quicktime",
        "video/webm",
    }:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Unsupported video format. Please use MP4, MOV, or WebM.",
                "quality_checks": {
                    "person_detected": False,
                    "full_body_visible": False,
                    "feet_visible": False,
                    "enough_frames": False,
                    "movement_detected": False,
                },
            },
        )

    if "mp4" in content_type:
        suffix = ".mp4"
    elif "mov" in content_type or "quicktime" in content_type:
        suffix = ".mov"
    elif "webm" in content_type:
        suffix = ".webm"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        shutil.copyfileobj(video.file, tmp_file)
        return tmp_file.name


def _save_image_upload(image: UploadFile) -> str:
    suffix = Path(image.filename or "calibration.jpg").suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=422, detail="Calibration images must be JPG, PNG, or WebP.")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        shutil.copyfileobj(image.file, tmp_file)
        return tmp_file.name


def _read_image(path: str):
    image = cv2.imread(path)
    if image is None:
        raise HTTPException(status_code=422, detail="Calibration image could not be read.")
    return image


def _http_quality(err: QualityError) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={"message": str(err), "quality_checks": err.quality_checks},
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Sports Talent AI API"}


@app.post("/api/long-jump/calibrate")
async def calibrate_long_jump_images(
    ground_image: UploadFile = File(...),
    reference_image: UploadFile = File(...),
    demo_mode: bool = Form(False),
):
    ground_path = _save_image_upload(ground_image)
    reference_path = _save_image_upload(reference_image)
    try:
        result = calibrate_two_images(
            _read_image(ground_path),
            _read_image(reference_path),
            demo_mode=demo_mode,
        )
        if not result.get("valid"):
            raise HTTPException(status_code=422, detail={"message": result["rejection_reason"], "calibration": result})
        return {"status": "ok", "calibration": result}
    finally:
        for path in (ground_path, reference_path):
            if os.path.exists(path):
                os.remove(path)


@app.post("/api/quality-check")
async def quality_check(video: UploadFile = File(...)):
    tmp_path = _save_upload(video)
    try:
        result = inspect_video_quality(tmp_path)
        return {"status": "ok", **result}
    except QualityError as e:
        raise _http_quality(e)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@app.post("/api/assess")
async def process_assessment(
    full_name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    state_district: str = Form(...),
    test_type: str = Form("VERTICAL_JUMP"),
    video: UploadFile = File(...),
):
    tmp_path = _save_upload(video)

    try:
        metrics = analyze_vertical_jump(tmp_path)

        percentile = calculate_percentile(metrics["jump_height_cm"], age, gender)
        talent_tier = get_talent_tier(percentile)
        benchmark_desc = get_benchmark_description(percentile, metrics["jump_height_cm"])

        athlete_profile = {
            "full_name": full_name,
            "age": age,
            "gender": gender,
        }
        ai_report = generate_coach_report(athlete_profile, metrics, percentile)

        if supabase:
            try:
                db_payload = {
                    "athlete_data": athlete_profile,
                    "district": state_district,
                    "test_type": test_type,
                    "metric_jump_height_cm": metrics["jump_height_cm"],
                    "metric_hang_time_sec": metrics["hang_time_sec"],
                    "percentile_score": percentile,
                    "talent_tier": talent_tier,
                    "coach_summary": ai_report["coach_summary"],
                    "improvement_tips": ai_report["improvement_tips"],
                }
                res = supabase.table("assessments").insert(db_payload).execute()
                record_id = res.data[0]["id"] if res.data else "no-id"
            except Exception:
                record_id = "db-skipped"
        else:
            record_id = "demo-id"

        return {
            "status": "success",
            "assessment_id": record_id,
            "athlete": {
                "full_name": full_name,
                "age": age,
                "gender": gender,
                "location": state_district,
            },
            "metrics": metrics,
            "benchmark": {
                "percentile": percentile,
                "talent_tier": talent_tier,
                "description": benchmark_desc,
                "disclaimer": (
                    "Prototype benchmark for contextual comparison. "
                    "Production deployment requires validation against "
                    "representative sports-science datasets."
                ),
            },
            "report": {
                "coach_summary": ai_report["coach_summary"],
                "improvement_tips": ai_report["improvement_tips"],
                "ai_generated": ai_report.get("ai_generated", False),
                "next_step": "Perform a sprint/agility assessment for a broader athletic profile.",
            },
        }

    except QualityError as e:
        raise _http_quality(e)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@app.post("/api/assess/long-jump")
@app.post("/api/long-jump/assess")
async def process_long_jump_assessment(
    full_name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    state_district: str = Form(...),
    ref_width_m: float = Form(1.0),
    ref_height_m: float = Form(0.5),
    demo_mode: bool = Form(False),
    calibration_json: str | None = Form(None),
    video: UploadFile = File(...),
):
    tmp_path = _save_upload(video)

    try:
        import json

        calibration = json.loads(calibration_json) if calibration_json else None
        metrics = analyze_long_jump(
            tmp_path,
            ref_width_m=ref_width_m,
            ref_height_m=ref_height_m,
            demo_mode=demo_mode,
            calibration=calibration,
        )
        athlete_profile = {"full_name": full_name, "age": age, "gender": gender}
        coach_summary = (
            f"{full_name} produced a long jump distance of {metrics['jump_distance_m']} m with "
            f"{metrics['detection_confidence']}% detection confidence."
        )
        improvement_tips = [
            "Drive the lead leg aggressively through takeoff while keeping the torso tall.",
            "Maintain a strong, consistent approach rhythm before the final plant.",
            "Keep the landing controlled to preserve horizontal momentum and reduce loss of distance.",
        ]

        if supabase:
            try:
                db_payload = {
                    "athlete_data": athlete_profile,
                    "district": state_district,
                    "test_type": "LONG_JUMP",
                    "metric_jump_distance_m": metrics["jump_distance_m"],
                    "metric_takeoff_quality": metrics.get("takeoff_quality"),
                    "metric_landing_quality": metrics.get("landing_quality"),
                    "metric_technique_score": metrics.get("technique_score"),
                    "measurement_confidence": metrics.get("measurement_confidence"),
                    "coach_summary": coach_summary,
                    "improvement_tips": improvement_tips,
                }
                res = supabase.table("assessments").insert(db_payload).execute()
                record_id = res.data[0]["id"] if res.data else "no-id"
            except Exception:
                record_id = "db-skipped"
        else:
            record_id = "demo-id"

        return {
            "status": "success",
            "assessment_id": record_id,
            "assessment_type": "LONG_JUMP",
            "athlete": {
                "full_name": full_name,
                "age": age,
                "gender": gender,
                "location": state_district,
            },
            "metrics": metrics,
            "report": {
                "coach_summary": coach_summary,
                "improvement_tips": improvement_tips,
                "ai_generated": False,
                "next_step": "Review approach rhythm and landing mechanics for the next trial.",
            },
        }

    except LongJumpError as e:
        raise HTTPException(status_code=422, detail={"message": str(e), "quality_checks": e.quality_checks, "details": e.details})
    except QualityError as e:
        raise _http_quality(e)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
