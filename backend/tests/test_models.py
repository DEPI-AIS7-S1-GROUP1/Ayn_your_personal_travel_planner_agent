"""Schema tests: the happy path (Sara's journey) and the rules the database must enforce.

Example data is copied from mock-data/ on the task1-roaa branch (API contract).
"""

import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.exc import IntegrityError

from app.models import Plan, Profile, Rating, Trip, User

BACKEND_DIR = Path(__file__).resolve().parents[1]

PROFILE = {
    "personality": ["foodie", "history-loving"],
    "hobbies": ["museums", "photography", "local-markets"],
    "food_likes": ["seafood", "grilled meat", "koshari"],
    "food_dislikes": ["very spicy food"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "Small group tours and walking through old neighbourhoods.",
    "disliked_last_trip": "Long bus rides and crowded beaches.",
}

BUDGET_SPLIT = {"hotel": 24000, "food": 12000, "activities": 14000, "transport": 10000}

ITINERARY = [
    {
        "day": 1,
        "date": "2026-11-10",
        "activities": [
            {
                "id": "act_001",
                "title": "Airport transfer to the hotel",
                "description": "Private car from Sharm El Sheikh airport to the hotel in Naama Bay, about 20 minutes.",
                "time_slot": "morning",
                "estimated_cost": 600,
                "category": "transport",
            },
            {
                "id": "act_003",
                "title": "Late lunch at Farsha Cafe",
                "description": "Grilled fish and mezze on the terrace, a good first taste of the local seafood.",
                "time_slot": "afternoon",
                "estimated_cost": 900,
                "category": "food",
            },
        ],
    }
]

OPTIONS = {
    "flights": [
        {
            "id": "flt_001",
            "airline": "EgyptAir",
            "outbound": {"from": "CAI", "to": "SSH", "departure": "2026-11-10T08:30", "arrival": "2026-11-10T09:45"},
            "return": {"from": "SSH", "to": "CAI", "departure": "2026-11-12T20:00", "arrival": "2026-11-12T21:15"},
            "price": 7000,
            "details": "Direct flight, one cabin bag each.",
        }
    ],
    "hotels": [
        {
            "id": "htl_001",
            "name": "Coral Bay Resort",
            "stars": 4,
            "area": "Naama Bay",
            "price_per_night": 12000,
            "total_price": 24000,
            "details": "Breakfast included, five minutes from the beach.",
            "image_url": "/images/hotels/coral-bay.jpg",
        }
    ],
}


# --- builders -----------------------------------------------------------------

def make_user(email="sara@example.com"):
    # A placeholder hash; real hashing is Step 3.
    return User(email=email, password_hash="$2b$12$placeholderhashnotarealpassword")


def make_trip(user, **overrides):
    fields = dict(
        destination_city="Sharm El Sheikh",
        destination_country="Egypt",
        start_date=date(2026, 11, 10),
        end_date=date(2026, 11, 12),
        total_budget=60000,
        currency="EGP",
        travelers=2,
    )
    if user is not None:  # passing user=None would silently set user_id to NULL
        fields["user"] = user
    fields.update(overrides)
    return Trip(**fields)


def make_plan(trip, **overrides):
    fields = dict(budget_split=BUDGET_SPLIT, itinerary=ITINERARY, options=OPTIONS)
    if trip is not None:  # passing trip=None would silently set trip_id to NULL
        fields["trip"] = trip
    fields.update(overrides)
    return Plan(**fields)


def add_sara_journey(session):
    """signup -> onboarding -> trip -> AI plan -> confirm -> rating"""
    user = make_user()
    session.add(user)
    session.flush()

    session.add(Profile(user=user, **PROFILE))
    trip = make_trip(user)
    plan = make_plan(trip, selected_flight_id="flt_001", selected_hotel_id="htl_001")
    session.add_all([trip, plan])
    session.flush()

    plan.status = "confirmed"
    session.add(
        Rating(
            plan=plan,
            score=4,
            liked=["The snorkelling day", "Evening at the old market"],
            disliked=["Too much time in transit on day 1"],
            comment="Great mix of relaxed and active.",
        )
    )
    session.commit()
    return user


def assert_rejected(session, *objects, reason):
    """The flush must fail, and for the expected reason (checked against the DB error)."""
    session.add_all(objects)
    with pytest.raises(IntegrityError, match=reason):
        session.flush()
    session.rollback()


# --- schema shape -------------------------------------------------------------

def test_all_contract_entities_have_tables(engine):
    assert set(inspect(engine).get_table_names()) == {"users", "profiles", "trips", "plans", "ratings"}


def test_users_table_has_no_plaintext_password_column(engine):
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    assert "password_hash" in columns
    assert "password" not in columns


def test_sqlite_foreign_keys_are_enforced(session):
    assert session.execute(text("PRAGMA foreign_keys")).scalar() == 1


# --- happy path ---------------------------------------------------------------

def test_sara_journey_is_stored_and_read_back(session):
    user = add_sara_journey(session)
    session.expire_all()  # force a real read from the database

    user = session.get(User, user.id)
    assert user.email == "sara@example.com"

    assert user.profile.personality == ["foodie", "history-loving"]
    assert user.profile.dietary_limits == ["halal"]

    [trip] = user.trips
    assert (trip.destination_city, trip.destination_country) == ("Sharm El Sheikh", "Egypt")
    assert trip.start_date == date(2026, 11, 10)
    assert trip.total_budget == 60000 and trip.currency == "EGP"

    plan = trip.plan
    assert plan.status == "confirmed"
    assert plan.budget_split == BUDGET_SPLIT
    assert plan.itinerary == ITINERARY  # nested JSON survives a round trip
    assert plan.options == OPTIONS
    assert plan.selected_hotel_id == "htl_001"

    assert plan.rating.score == 4
    assert plan.rating.liked == ["The snorkelling day", "Evening at the old market"]


def test_defaults(session):
    user = make_user()
    trip = make_trip(user)
    plan = make_plan(trip)
    session.add_all([user, Profile(user=user, personality=["calm"], hobbies=["beaches"]), trip, plan])
    session.flush()

    assert plan.status == "draft"
    assert plan.selected_flight_id is None
    assert user.profile.food_likes == [] and user.profile.liked_last_trip == ""
    assert user.created_at is not None and plan.updated_at is not None


def test_ids_have_contract_prefixes_and_are_unique(session):
    user = add_sara_journey(session)
    plan = user.trips[0].plan
    pattern = r"^{}_[0-9a-f]{{16}}$"
    assert re.match(pattern.format("user"), user.id)
    assert re.match(pattern.format("trip"), user.trips[0].id)
    assert re.match(pattern.format("plan"), plan.id)
    assert re.match(pattern.format("rat"), plan.rating.id)

    others = [make_user(f"user{i}@example.com") for i in range(50)]
    session.add_all(others)
    session.flush()
    assert len({u.id for u in others}) == 50


# --- constraints the database must enforce -----------------------------------

def test_duplicate_email_rejected(session):
    session.add(make_user())
    session.commit()
    assert_rejected(session, make_user(), reason="UNIQUE constraint failed: users.email")


def test_second_profile_for_same_user_rejected(session):
    user = add_sara_journey(session)
    assert_rejected(
        session, Profile(user_id=user.id, personality=["calm"], hobbies=["beaches"]),
        reason="UNIQUE constraint failed: profiles.user_id",
    )


def test_second_plan_for_same_trip_rejected(session):
    user = add_sara_journey(session)
    assert_rejected(
        session, make_plan(None, trip_id=user.trips[0].id), reason="UNIQUE constraint failed: plans.trip_id"
    )


def test_second_rating_for_same_plan_rejected(session):
    user = add_sara_journey(session)
    assert_rejected(
        session, Rating(plan_id=user.trips[0].plan.id, score=5), reason="UNIQUE constraint failed: ratings.plan_id"
    )


def test_trip_for_missing_user_rejected(session):
    assert_rejected(
        session, make_trip(None, user_id="user_doesnotexist0000"), reason="FOREIGN KEY constraint failed"
    )


def test_rating_for_missing_plan_rejected(session):
    assert_rejected(
        session, Rating(plan_id="plan_doesnotexist0000", score=3), reason="FOREIGN KEY constraint failed"
    )


@pytest.mark.parametrize(
    ("overrides", "constraint"),
    [
        ({"total_budget": 0}, "ck_trips_total_budget_positive"),
        ({"travelers": 0}, "ck_trips_travelers_range"),
        ({"travelers": 11}, "ck_trips_travelers_range"),
        ({"end_date": date(2026, 11, 9)}, "ck_trips_dates_order"),  # before start_date
        ({"currency": "EGYP"}, "ck_trips_currency_code"),
    ],
    ids=["budget-zero", "travelers-zero", "travelers-eleven", "end-before-start", "currency-not-3-letters"],
)
def test_invalid_trip_rejected(session, overrides, constraint):
    user = make_user()
    session.add(user)
    session.commit()
    assert_rejected(session, make_trip(user, **overrides), reason=f"CHECK constraint failed: {constraint}")


def test_unknown_plan_status_rejected(session):
    user = make_user()
    assert_rejected(
        session, user, make_plan(make_trip(user), status="done"), reason="CHECK constraint failed: ck_plans_status"
    )


@pytest.mark.parametrize("score", [0, 6])
def test_score_outside_1_to_5_rejected(session, score):
    user = add_sara_journey(session)
    plan = user.trips[0].plan
    session.delete(plan.rating)
    session.commit()
    assert_rejected(
        session, Rating(plan_id=plan.id, score=score), reason="CHECK constraint failed: ck_ratings_score_range"
    )


def test_missing_required_field_rejected(session):
    user = make_user()
    session.add(user)
    session.commit()
    assert_rejected(
        session, Profile(user_id=user.id, personality=["calm"]),  # hobbies missing
        reason="NOT NULL constraint failed: profiles.hobbies",
    )


# --- cascade delete -----------------------------------------------------------

def test_deleting_user_deletes_all_their_data(session):
    user = add_sara_journey(session)
    other = make_user("other@example.com")
    session.add_all([other, make_trip(other)])
    session.commit()

    session.delete(user)
    session.commit()

    assert session.scalar(select(func.count()).select_from(Profile)) == 0
    assert session.scalar(select(func.count()).select_from(Plan)) == 0
    assert session.scalar(select(func.count()).select_from(Rating)) == 0
    # The other user's trip is untouched.
    assert session.scalars(select(Trip.user_id)).all() == [other.id]


def test_database_level_cascade_without_orm(session):
    """ON DELETE CASCADE works even for raw SQL (e.g. someone using a DB tool)."""
    add_sara_journey(session)
    session.execute(text("DELETE FROM users"))
    session.commit()
    for table in ("profiles", "trips", "plans", "ratings"):
        assert session.execute(text(f"SELECT count(*) FROM {table}")).scalar() == 0


# --- init_db script on a real file ------------------------------------------

def test_init_db_script_creates_tables_in_a_file(tmp_path):
    db_file = tmp_path / "travel_planner.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_file}"}
    result = subprocess.run(
        [sys.executable, "-m", "scripts.init_db"],
        cwd=BACKEND_DIR, env=env, capture_output=True, text=True, check=True,
    )
    assert "Tables: plans, profiles, ratings, trips, users" in result.stdout
    assert db_file.exists()

    file_engine = create_engine(f"sqlite:///{db_file}")
    assert set(inspect(file_engine).get_table_names()) == {"users", "profiles", "trips", "plans", "ratings"}
    file_engine.dispose()
