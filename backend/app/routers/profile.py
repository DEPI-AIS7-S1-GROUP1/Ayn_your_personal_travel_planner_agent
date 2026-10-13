"""Profile router (contract §3.2, §4 GET/PUT /profile)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import Profile, User, utcnow

router = APIRouter(tags=["profile"])


class ProfilePayload(BaseModel):
    personality: list[str] = Field(min_length=1, max_length=3)
    hobbies: list[str] = Field(min_length=1)
    food_likes: list[str] = Field(default_factory=list, max_length=10)
    food_dislikes: list[str] = Field(default_factory=list, max_length=10)
    dietary_limits: list[str] = Field(default_factory=list)
    liked_last_trip: str = ""
    disliked_last_trip: str = ""


def _serialize_profile_dict(prof: Profile) -> dict:
    return {
        "personality": prof.personality,
        "hobbies": prof.hobbies,
        "food_likes": prof.food_likes,
        "food_dislikes": prof.food_dislikes,
        "dietary_limits": prof.dietary_limits,
        "liked_last_trip": prof.liked_last_trip,
        "disliked_last_trip": prof.disliked_last_trip,
    }


@router.get("/profile")
def get_profile(user: User = Depends(get_current_user)):
    """Read user survey answers."""
    if user.profile is None:
        return {"onboarding_completed": False, "profile": None}
    return {
        "onboarding_completed": True,
        "profile": _serialize_profile_dict(user.profile),
    }


@router.put("/profile")
def update_profile(
    payload: ProfilePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save or update survey answers."""
    prof = user.profile
    if prof is None:
        prof = Profile(user_id=user.id)
        db.add(prof)

    prof.personality = payload.personality
    prof.hobbies = payload.hobbies
    prof.food_likes = payload.food_likes
    prof.food_dislikes = payload.food_dislikes
    prof.dietary_limits = payload.dietary_limits
    prof.liked_last_trip = payload.liked_last_trip
    prof.disliked_last_trip = payload.disliked_last_trip
    prof.updated_at = utcnow()

    db.commit()
    db.refresh(prof)

    return {
        "onboarding_completed": True,
        "profile": _serialize_profile_dict(prof),
    }
