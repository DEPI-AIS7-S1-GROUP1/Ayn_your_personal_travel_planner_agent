"""Profile router (contract §3.2, §4 GET/PUT /profile)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import Profile, User, utcnow

router = APIRouter(tags=["profile"])


# Allowed values (contract §2). Anything else is a 400 VALIDATION_ERROR here; without this
# check a bad value would be saved and then make every later POST /trips fail in the agent.
Personality = Literal["calm", "adventurous", "foodie", "landmark-loving", "history-loving", "style-loving", "exploring"]
Hobby = Literal["hiking", "diving", "photography", "museums", "beaches", "nightlife", "cooking", "wildlife",
                "cycling", "music", "art", "local-markets"]
DietaryLimit = Literal["vegetarian", "vegan", "halal", "gluten-free", "dairy-free", "nut-free"]
# Free text goes into the agent's prompt, so each item and note has a length cap.
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class ProfilePayload(BaseModel):
    personality: list[Personality] = Field(min_length=1, max_length=3)
    hobbies: list[Hobby] = Field(min_length=1, max_length=12)
    food_likes: list[Tag] = Field(default_factory=list, max_length=10)
    food_dislikes: list[Tag] = Field(default_factory=list, max_length=10)
    dietary_limits: list[DietaryLimit] = Field(default_factory=list, max_length=6)
    liked_last_trip: Note = ""
    disliked_last_trip: Note = ""


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
