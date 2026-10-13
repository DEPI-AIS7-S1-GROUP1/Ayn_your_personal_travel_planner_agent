"""Ratings router (contract §3.9, §4 POST /ratings)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import Plan, Rating, User

router = APIRouter(tags=["ratings"])


class CreateRatingPayload(BaseModel):
    plan_id: str
    score: int = Field(ge=1, le=5)
    liked: list[str] = Field(default_factory=list)
    disliked: list[str] = Field(default_factory=list)
    comment: str = ""


@router.post("/ratings", status_code=201)
def create_rating(
    payload: CreateRatingPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save rating and feedback for a confirmed plan (contract §4 POST /ratings)."""
    # Score 1-5 validation
    if payload.score < 1 or payload.score > 5:
        raise ApiError(400, "VALIDATION_ERROR", "Rating score must be between 1 and 5.")

    # Plan lookup & ownership
    plan = db.get(Plan, payload.plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{payload.plan_id}' not found.")

    # Status check: only confirmed plans can be rated
    if plan.status != "confirmed":
        raise ApiError(409, "RATING_NOT_ALLOWED", "Only confirmed plans can be rated.")

    # Check for existing rating
    if plan.rating is not None:
        raise ApiError(409, "ALREADY_RATED", "This plan already has a rating.")

    rating = Rating(
        plan_id=plan.id,
        score=payload.score,
        liked=payload.liked,
        disliked=payload.disliked,
        comment=payload.comment,
    )
    db.add(rating)

    # Sync liked/disliked memories to user profile for future planning
    if user.profile:
        if payload.liked:
            user.profile.liked_last_trip = "; ".join(payload.liked)
        if payload.disliked:
            user.profile.disliked_last_trip = "; ".join(payload.disliked)

    db.commit()

    return {
        "id": rating.id,
        "plan_id": rating.plan_id,
        "score": rating.score,
        "liked": rating.liked,
        "disliked": rating.disliked,
        "comment": rating.comment,
        "created_at": rating.created_at.date().isoformat(),
    }
