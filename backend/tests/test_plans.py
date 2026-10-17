"""Tests for plans router and POST /plans/{id}/chat (contract §4.75)."""

from datetime import date
import pytest
from app.models import Plan, Profile, Trip, User
from app.security import create_access_token

BUDGET_SPLIT = {"hotel": 24000, "food": 12000, "activities": 14000, "transport": 10000}
ITINERARY = [
    {
        "day": 1,
        "date": "2026-11-10",
        "activities": [
            {
                "id": "act_001",
                "title": "Airport transfer",
                "description": "Transfer to hotel",
                "time_slot": "morning",
                "estimated_cost": 600,
                "category": "transport",
            },
            {
                "id": "act_002",
                "title": "Seafood Lunch",
                "description": "Grilled seafood and salad",
                "time_slot": "afternoon",
                "estimated_cost": 900,
                "category": "food",
            },
        ],
    },
    {
        "day": 2,
        "date": "2026-11-11",
        "activities": [
            {
                "id": "act_003",
                "title": "Beach walk",
                "description": "Walk along the bay",
                "time_slot": "morning",
                "estimated_cost": 0,
                "category": "activities",
            }
        ],
    },
]
OPTIONS = {"flights": [], "hotels": []}


def create_test_setup(session):
    user = User(email="sara@example.com", password_hash="$2b$12$placeholderhash")
    session.add(user)
    session.flush()

    profile = Profile(
        user_id=user.id,
        personality=["foodie"],
        hobbies=["museums"],
        food_likes=["koshari"],
        food_dislikes=["seafood"],
        dietary_limits=["halal"],
    )
    session.add(profile)

    trip = Trip(
        user_id=user.id,
        destination_city="Sharm El Sheikh",
        destination_country="Egypt",
        start_date=date(2026, 11, 10),
        end_date=date(2026, 11, 12),
        total_budget=60000,
        currency="EGP",
        travelers=2,
    )
    session.add(trip)
    session.flush()

    plan = Plan(
        trip_id=trip.id,
        status="draft",
        budget_split=BUDGET_SPLIT,
        itinerary=ITINERARY,
        options=OPTIONS,
    )
    session.add(plan)
    session.commit()

    token = create_access_token(user.id)
    return user, trip, plan, token


def test_chat_unauthorized(client, session):
    _, _, plan, _ = create_test_setup(session)
    res = client.post(f"/api/plans/{plan.id}/chat", json={"message": "Make it cheaper"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_chat_not_found(client, session):
    _, _, _, token = create_test_setup(session)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/plans/plan_nonexistent/chat", json={"message": "Make it cheaper"}, headers=headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_chat_rejects_non_draft_with_409(client, session):
    _, _, plan, token = create_test_setup(session)
    plan.status = "confirmed"
    session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(f"/api/plans/{plan.id}/chat", json={"message": "Make it cheaper"}, headers=headers)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "PLAN_NOT_EDITABLE"


def test_chat_clarification_and_update_flow(client, session):
    _, trip, plan, token = create_test_setup(session)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Clarification needed
    res1 = client.post(
        f"/api/plans/{plan.id}/chat",
        json={"message": "Make the budget higher."},
        headers=headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["action"] == "needs_clarification"
    assert "What total budget" in data1["message"]["content"]
    assert data1["plan"] is None
    assert data1["trip"] is None
    conv_id = data1["conversation_id"]
    assert conv_id is not None

    # Step 2: Answer with amount and currency
    res2 = client.post(
        f"/api/plans/{plan.id}/chat",
        json={"conversation_id": conv_id, "message": "Set it to 75000 EGP."},
        headers=headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["action"] == "updated"
    assert data2["plan"] is not None
    assert data2["plan"]["total_budget"] == 75000
    assert data2["trip"]["total_budget"] == 75000
    bs = data2["plan"]["budget_split"]
    assert bs["hotel"] + bs["food"] + bs["activities"] + bs["transport"] == 75000


def test_get_and_confirm_plan(client, session):
    _, _, plan, token = create_test_setup(session)
    headers = {"Authorization": f"Bearer {token}"}

    # Read plan
    res = client.get(f"/api/plans/{plan.id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == plan.id
    assert res.json()["status"] == "draft"

    # Confirm plan
    res_confirm = client.post(f"/api/plans/{plan.id}/confirm", headers=headers)
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "confirmed"

    # Confirming again fails with 409
    res_fail = client.post(f"/api/plans/{plan.id}/confirm", headers=headers)
    assert res_fail.status_code == 409


def test_put_plan_itinerary_validation(client, session):
    _, _, plan, token = create_test_setup(session)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Date gap validation
    bad_itinerary_gap = [
        {
            "day": 1,
            "date": "2026-11-10",
            "activities": [{"title": "Transfer", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "transport"}],
        },
        {
            "day": 2,
            "date": "2026-11-15",  # Gap!
            "activities": [{"title": "Beach", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
        {
            "day": 3,
            "date": "2026-11-12",
            "activities": [{"title": "Market", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
    ]
    res = client.put(f"/api/plans/{plan.id}", json={"itinerary": bad_itinerary_gap}, headers=headers)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    # 2. Invalid category
    bad_cat = [
        {
            "day": 1,
            "date": "2026-11-10",
            "activities": [{"title": "Transfer", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "flying"}],
        },
        {
            "day": 2,
            "date": "2026-11-11",
            "activities": [{"title": "Beach", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
        {
            "day": 3,
            "date": "2026-11-12",
            "activities": [{"title": "Market", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
    ]
    res_cat = client.put(f"/api/plans/{plan.id}", json={"itinerary": bad_cat}, headers=headers)
    assert res_cat.status_code == 400
    assert res_cat.json()["error"]["code"] == "VALIDATION_ERROR"

    # 3. Category budget limit exceeded
    # Transport budget is 10000; activity estimated_cost is 15000
    over_budget_itinerary = [
        {
            "day": 1,
            "date": "2026-11-10",
            "activities": [{"title": "Super limo", "description": "d", "time_slot": "morning", "estimated_cost": 15000, "category": "transport"}],
        },
        {
            "day": 2,
            "date": "2026-11-11",
            "activities": [{"title": "Beach", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
        {
            "day": 3,
            "date": "2026-11-12",
            "activities": [{"title": "Market", "description": "d", "time_slot": "morning", "estimated_cost": 100, "category": "activities"}],
        },
    ]
    res_over = client.put(f"/api/plans/{plan.id}", json={"itinerary": over_budget_itinerary}, headers=headers)
    assert res_over.status_code == 400
    assert res_over.json()["error"]["code"] == "VALIDATION_ERROR"


def test_ratings_flow(client, session):
    _, _, plan, token = create_test_setup(session)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Rating on draft plan fails with 409 RATING_NOT_ALLOWED
    res_draft_rating = client.post(
        "/api/ratings",
        json={"plan_id": plan.id, "score": 5, "liked": ["Food"], "disliked": [], "comment": "Loved it"},
        headers=headers,
    )
    assert res_draft_rating.status_code == 409
    assert res_draft_rating.json()["error"]["code"] == "RATING_NOT_ALLOWED"

    # 2. Confirm plan
    client.post(f"/api/plans/{plan.id}/confirm", headers=headers)

    # 3. Rating with score out of bounds
    res_bad_score = client.post(
        "/api/ratings",
        json={"plan_id": plan.id, "score": 6, "liked": [], "disliked": [], "comment": ""},
        headers=headers,
    )
    assert res_bad_score.status_code == 400

    # 4. Successful rating
    res_success = client.post(
        "/api/ratings",
        json={"plan_id": plan.id, "score": 4, "liked": ["Beach"], "disliked": ["Heat"], "comment": "Nice!"},
        headers=headers,
    )
    assert res_success.status_code == 201
    data = res_success.json()
    assert data["score"] == 4
    assert data["plan_id"] == plan.id
    assert "Beach" in data["liked"]

    # 5. Rating again fails with 409 ALREADY_RATED
    res_again = client.post(
        "/api/ratings",
        json={"plan_id": plan.id, "score": 5, "liked": [], "disliked": [], "comment": ""},
        headers=headers,
    )
    assert res_again.status_code == 409
    assert res_again.json()["error"]["code"] == "ALREADY_RATED"


def test_trips_profile_required(client, session):
    user = User(email="newuser@example.com", password_hash="$2b$12$placeholderhash")
    session.add(user)
    session.commit()
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Creating a trip without completing profile survey returns 409 PROFILE_REQUIRED
    res = client.post(
        "/api/trips",
        json={
            "destination": {"city": "Cairo", "country": "Egypt"},
            "start_date": "2026-11-10",
            "end_date": "2026-11-12",
            "total_budget": 50000,
            "currency": "EGP",
            "travelers": 2,
        },
        headers=headers,
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "PROFILE_REQUIRED"


def test_currencies_endpoint(client):
    res = client.get("/api/currencies")
    assert res.status_code == 200
    assert "EGP" in res.json()["supported"]

    res_default = client.get("/api/currencies/default")
    assert res_default.status_code == 200
    assert res_default.json()["default"] == "EGP"

