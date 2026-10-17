"""Recreate the demo accounts in one command, so the demo survives a database reset.

Free hosts can wipe the SQLite file on every restart. This script puts back the demo users,
their survey profiles and one confirmed plan. It is safe to run any number of times: an
account that already exists is left as it is.

Run from backend/:
    python -m scripts.seed_demo

The server also runs it on every start when SEED_DEMO_DATA=true (see app/main.py).
The password of every demo account comes from DEMO_USER_PASSWORD in .env, never from code.
"""

import os
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registers the tables on Base)
from app.database import Base, SessionLocal, engine
from app.models import Plan, Profile, Rating, Trip, User
from app.security import hash_password

# The plan is built by the agent's offline tier, so seeding needs no AI key and no network.
from agent.main import generate_plan_from_dict

DEMO_USERS = [
    {
        "email": "demo@ayn-travel.com",
        "profile": {
            "personality": ["calm", "foodie"],
            "hobbies": ["beaches", "local-markets", "photography"],
            "food_likes": ["seafood", "grilled fish", "koshari"],
            "food_dislikes": ["very spicy food"],
            "dietary_limits": ["halal"],
            "liked_last_trip": "Quiet beaches and walking through old markets.",
            "disliked_last_trip": "Long bus rides and crowded places.",
        },
        "confirmed_trip": {
            "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
            "start_date": "2026-11-10",
            "end_date": "2026-11-12",
            "total_budget": 60000,
            "currency": "EGP",
            "travelers": 2,
        },
    },
    {
        # Arabic demo user (Y10): the free-text answers are in Arabic.
        "email": "demo.ar@ayn-travel.com",
        "profile": {
            "personality": ["history-loving", "exploring"],
            "hobbies": ["museums", "photography"],
            "food_likes": ["كشري", "ملوخية", "فول وطعمية"],
            "food_dislikes": ["الأكل الحار جدًا"],
            "dietary_limits": ["halal"],
            "liked_last_trip": "زيارة المعابد والمشي في الأسواق القديمة.",
            "disliked_last_trip": "الزحمة والانتظار الطويل في المواصلات.",
        },
        "confirmed_trip": None,
    },
]


def _demo_password() -> str:
    password = os.getenv("DEMO_USER_PASSWORD", "")
    if len(password) < 8:
        raise RuntimeError(
            "DEMO_USER_PASSWORD is missing or shorter than 8 characters. "
            "Set it in .env (or on the host) before seeding the demo data."
        )
    return password


def _create_confirmed_plan(db: Session, user: User, profile: dict, trip_data: dict) -> None:
    gen = generate_plan_from_dict(profile, trip_data, force_tier=3)
    trip = Trip(
        user_id=user.id,
        destination_city=trip_data["destination"]["city"],
        destination_country="Egypt",
        start_date=date.fromisoformat(trip_data["start_date"]),
        end_date=date.fromisoformat(trip_data["end_date"]),
        total_budget=trip_data["total_budget"],
        currency=trip_data["currency"],
        travelers=trip_data["travelers"],
    )
    db.add(trip)
    db.flush()
    db.add(Plan(
        trip_id=trip.id,
        status="confirmed",
        budget_split=gen.budget_split.model_dump(),
        itinerary=[day.model_dump() for day in gen.itinerary],
        options=gen.options.model_dump(by_alias=True),
        selected_flight_id=gen.selected_flight_id,
        selected_hotel_id=gen.selected_hotel_id,
        search_context={"language": "en"},
    ))


def seed_demo(db: Session) -> list[str]:
    """Create every missing demo account. Returns the emails that were created."""
    password_hash = hash_password(_demo_password())
    created = []
    for demo in DEMO_USERS:
        if db.scalar(select(User.id).where(User.email == demo["email"])) is not None:
            continue
        user = User(email=demo["email"], password_hash=password_hash)
        db.add(user)
        db.flush()
        db.add(Profile(user_id=user.id, **demo["profile"]))
        if demo["confirmed_trip"]:
            _create_confirmed_plan(db, user, demo["profile"], demo["confirmed_trip"])
        created.append(demo["email"])
    db.commit()
    return created


def main() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        created = seed_demo(db)
    for demo in DEMO_USERS:
        status = "created" if demo["email"] in created else "already there"
        print(f"{demo['email']}: {status}")


if __name__ == "__main__":
    main()
