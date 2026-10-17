"""Create all tables in the database and optionally seed sample data.

Run from backend/:
    python -m scripts.init_db
    python -m scripts.init_db --seed
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from sqlalchemy import inspect
from sqlalchemy.orm import Session

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app import models
from app.database import Base, engine, SessionLocal
from app.security import hash_password

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PLAN_PATH = PROJECT_ROOT / "mock-data" / "3-day-sharm-plan.json"
PROFILE_PATH = PROJECT_ROOT / "mock-data" / "profile.json"


def seed_data(session: Session) -> None:
    # Check if sara@example.com already exists
    existing = session.query(models.User).filter_by(email="sara@example.com").first()
    if existing:
        print("Sample user sara@example.com already exists. Skipping seed.")
        return

    user = models.User(
        id="user_001",
        email="sara@example.com",
        password_hash=hash_password("password123"),
    )
    session.add(user)
    session.flush()

    # Load profile
    profile_data = {
        "personality": ["foodie", "history-loving"],
        "hobbies": ["museums", "photography", "local-markets"],
        "food_likes": ["seafood", "grilled meat", "koshari"],
        "food_dislikes": ["very spicy food"],
        "dietary_limits": ["halal"],
        "liked_last_trip": "Small group tours and walking through old neighbourhoods.",
        "disliked_last_trip": "Long bus rides and crowded beaches.",
    }
    if PROFILE_PATH.exists():
        try:
            with open(PROFILE_PATH, "r", encoding="utf-8") as f:
                profile_data = json.load(f)
        except Exception:
            pass

    profile = models.Profile(
        user_id=user.id,
        personality=profile_data.get("personality", ["foodie"]),
        hobbies=profile_data.get("hobbies", ["museums"]),
        food_likes=profile_data.get("food_likes", []),
        food_dislikes=profile_data.get("food_dislikes", []),
        dietary_limits=profile_data.get("dietary_limits", []),
        liked_last_trip=profile_data.get("liked_last_trip", ""),
        disliked_last_trip=profile_data.get("disliked_last_trip", ""),
    )
    session.add(profile)

    # Load sample trip & plan
    if SAMPLE_PLAN_PATH.exists():
        with open(SAMPLE_PLAN_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        t_data = data.get("trip", {})
        p_data = data.get("plan", {})
    else:
        t_data = {}
        p_data = {}

    trip = models.Trip(
        id=t_data.get("id", "trip_001"),
        user_id=user.id,
        destination_city=t_data.get("destination", {}).get("city", "Sharm El Sheikh"),
        destination_country=t_data.get("destination", {}).get("country", "Egypt"),
        start_date=date.fromisoformat(t_data.get("start_date", "2026-11-10")),
        end_date=date.fromisoformat(t_data.get("end_date", "2026-11-12")),
        total_budget=t_data.get("total_budget", 60000),
        currency=t_data.get("currency", "EGP"),
        travelers=t_data.get("travelers", 2),
    )
    session.add(trip)
    session.flush()

    plan = models.Plan(
        id=p_data.get("id", "plan_001"),
        trip_id=trip.id,
        status=p_data.get("status", "draft"),
        budget_split=p_data.get("budget_split", {
            "hotel": 24000,
            "food": 12000,
            "activities": 14000,
            "transport": 10000,
        }),
        itinerary=p_data.get("itinerary", []),
        options=p_data.get("options", {"flights": [], "hotels": []}),
        selected_flight_id=p_data.get("selected_flight_id"),
        selected_hotel_id=p_data.get("selected_hotel_id"),
    )
    session.add(plan)
    session.commit()
    print("[OK] Seeded sample user (sara@example.com / password123), trip_001, and draft plan_001.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="store_true", default=True, help="Seed sample trip and draft plan")
    args = parser.parse_args()

    Base.metadata.create_all(engine)
    print(f"Database: {engine.url.render_as_string(hide_password=True)}")
    print("Tables:", ", ".join(sorted(inspect(engine).get_table_names())))

    if args.seed:
        with SessionLocal() as session:
            seed_data(session)


if __name__ == "__main__":
    main()
