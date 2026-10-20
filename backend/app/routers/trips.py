"""Trips router (contract §3.3, §4 POST/GET /trips)."""

import logging
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import Plan, Rating, Trip, User, utcnow
from app.routers.plans import serialize_plan, serialize_trip
from app.routers.currencies import SUPPORTED_CURRENCIES
from agent.main import generate_plan_from_dict

router = APIRouter(tags=["trips"])
logger = logging.getLogger(__name__)

# Past feedback goes into every new prompt; only the latest ratings are sent so the
# prompt stays small however many trips the user has rated.
PAST_FEEDBACK_RATINGS = 5


def get_past_feedback(db: Session, user_id: str) -> dict:
    """Collect what the user liked and disliked in their latest ratings."""
    ratings = db.execute(
        select(Rating)
        .join(Plan, Rating.plan_id == Plan.id)
        .join(Trip, Plan.trip_id == Trip.id)
        .where(Trip.user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(PAST_FEEDBACK_RATINGS)
    ).scalars().all()

    liked = []
    disliked = []
    for r in ratings:
        liked.extend(r.liked or [])
        disliked.extend(r.disliked or [])

    return {"liked": liked, "disliked": disliked}


class DestinationPayload(BaseModel):
    # The city goes straight into the agent's prompt, so its length is capped.
    city: str = Field(min_length=1, max_length=80)
    country: str = Field(default="Egypt", max_length=40)


class CreateTripPayload(BaseModel):
    destination: DestinationPayload
    start_date: str
    end_date: str
    total_budget: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    travelers: int = Field(ge=1, le=10)
    # Language the agent should write the plan in. Anything else is a 400 VALIDATION_ERROR.
    language: Literal["en", "ar"] = "en"


@router.get("/trips")
def list_trips(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the user's trips, newest first (contract §4 GET /trips)."""
    trips = db.execute(
        select(Trip)
        .where(Trip.user_id == user.id)
        .order_by(Trip.created_at.desc())
    ).scalars().all()

    items = []
    for t in trips:
        plan = t.plan
        rated = bool(plan and plan.rating)
        status = plan.status if plan else "draft"
        items.append({
            "trip_id": t.id,
            "plan_id": plan.id if plan else None,
            "destination": {
                "city": t.destination_city,
                "country": t.destination_country,
            },
            "start_date": t.start_date.isoformat(),
            "end_date": t.end_date.isoformat(),
            "travelers": t.travelers,
            "total_budget": t.total_budget,
            "currency": t.currency,
            "status": status,
            "rated": rated,
        })

    return {"trips": items}


@router.get("/trips/{trip_id}")
def get_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Read one trip with its plan (contract §4 GET /trips/{id})."""
    trip = db.get(Trip, trip_id)
    if trip is None or trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Trip '{trip_id}' not found.")

    plan_obj = serialize_plan(trip.plan) if trip.plan else None
    rating_obj = None
    if trip.plan and trip.plan.rating:
        r = trip.plan.rating
        rating_obj = {
            "id": r.id,
            "plan_id": r.plan_id,
            "score": r.score,
            "liked": r.liked,
            "disliked": r.disliked,
            "comment": r.comment,
            "created_at": r.created_at.date().isoformat(),
        }

    return {
        "trip_id": trip.id,
        "plan": plan_obj,
        "rating": rating_obj,
    }


@router.post("/trips", status_code=201)
def create_trip(
    payload: CreateTripPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a trip and generate a draft plan (contract §4 POST /trips)."""
    # Enforce contract §4: 409 PROFILE_REQUIRED when user.profile is None
    if user.profile is None:
        raise ApiError(409, "PROFILE_REQUIRED", "Profile survey required before planning a trip.")

    curr = payload.currency.upper()
    if curr not in SUPPORTED_CURRENCIES:
        raise ApiError(400, "INVALID_CURRENCY", f"Currency '{payload.currency}' is not supported.")

    if not payload.destination.city.strip():
        raise ApiError(400, "VALIDATION_ERROR", "destination.city: must not be empty.")
    if payload.destination.country.strip().lower() != "egypt":
        raise ApiError(400, "INVALID_DESTINATION", "Destination country must be Egypt.")

    try:
        s_date = date.fromisoformat(payload.start_date)
        e_date = date.fromisoformat(payload.end_date)
        if s_date < date.today():
            raise ValueError("start_date cannot be in the past")
        if s_date > e_date:
            raise ValueError("end_date must be on or after start_date")
        if (e_date - s_date).days > 13:
            raise ValueError("Trip length cannot exceed 14 days")
    except Exception as exc:
        raise ApiError(400, "VALIDATION_ERROR", f"Invalid dates: {exc}")

    # Generate draft plan using multi-tier agent generation pipeline
    profile_dict = {
        "personality": user.profile.personality,
        "hobbies": user.profile.hobbies,
        "food_likes": user.profile.food_likes,
        "food_dislikes": user.profile.food_dislikes,
        "dietary_limits": user.profile.dietary_limits,
        "past_feedback": get_past_feedback(db, user.id),
    }

    trip_dict = {
        "destination": {"city": payload.destination.city.strip(), "country": "Egypt"},
        "start_date": s_date.isoformat(),
        "end_date": e_date.isoformat(),
        "total_budget": payload.total_budget,
        "currency": curr,
        "travelers": payload.travelers,
        "language": payload.language,
    }

    # Nothing is written before the agent finishes: generation can take many seconds, and an open
    # write would lock SQLite for every other user (signups, survey saves) during that time.
    # Ending the read transaction here also releases the snapshot held since the profile was loaded.
    db.rollback()
    try:
        gen_plan = generate_plan_from_dict(profile_dict, trip_dict)
    except Exception:
        # Provider messages can include account details: they go to the log, not the client.
        logger.exception("Plan generation failed")
        raise ApiError(502, "GENERATION_FAILED", "Plan generation failed. Please try again.")

    # Trip and plan are written together in one short transaction.
    trip = Trip(
        user_id=user.id,
        destination_city=payload.destination.city.strip(),
        destination_country="Egypt",
        start_date=s_date,
        end_date=e_date,
        total_budget=payload.total_budget,
        currency=curr,
        travelers=payload.travelers,
    )
    db.add(trip)
    db.flush()

    plan = Plan(
        trip_id=trip.id,
        status="draft",
        budget_split=gen_plan.budget_split.model_dump(),
        itinerary=[day.model_dump() for day in gen_plan.itinerary],
        options=gen_plan.options.model_dump(by_alias=True),
        selected_flight_id=gen_plan.selected_flight_id,
        selected_hotel_id=gen_plan.selected_hotel_id,
        # The language is kept here instead of in a new database column (Y9). "tier" records
        # which generator wrote the plan (e.g. "mock_unverified"), so the UI can say so.
        search_context={"language": payload.language, "tier": gen_plan.search_context},
    )
    db.add(plan)
    db.commit()

    return {
        "trip_id": trip.id,
        "plan": serialize_plan(plan),
    }
