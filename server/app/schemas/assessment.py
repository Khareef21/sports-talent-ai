from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PoseAssessmentRequest(BaseModel):
    athlete_name: str = Field(..., min_length=1)
    sport: str = Field(..., min_length=1)
    video_url: Optional[str] = None
    keypoints: List[Dict[str, Any]] = Field(default_factory=list)


class AssessmentResult(BaseModel):
    id: str
    athlete_name: str
    sport: str
    score: float
    summary: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    keypoints: List[Dict[str, Any]] = Field(default_factory=list)
