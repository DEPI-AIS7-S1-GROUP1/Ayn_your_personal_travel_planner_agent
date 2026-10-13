"""Unit tests for chat_agent code guards and mock refinement."""

from agent.agents.chat_agent import (
    chat,
    chat_mock,
    check_immutable_fields_guard,
    check_budget_change_guard,
    check_dietary_limits_guard,
)

SAMPLE_TRIP = {
    "id": "trip_001",
    "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
    "start_date": "2026-11-10",
    "end_date": "2026-11-12",
    "total_budget": 60000,
    "currency": "EGP",
    "travelers": 2,
}

SAMPLE_PLAN = {
    "id": "plan_001",
    "trip_id": "trip_001",
    "status": "draft",
    "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
    "start_date": "2026-11-10",
    "end_date": "2026-11-12",
    "travelers": 2,
    "total_budget": 60000,
    "currency": "EGP",
    "budget_split": {"hotel": 24000, "food": 12000, "activities": 14000, "transport": 10000},
    "itinerary": [
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
                    "title": "Seafood Lunch at Farsha Cafe",
                    "description": "Grilled shrimp and fish mezze",
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
                    "title": "Snorkeling trip",
                    "description": "Ras Mohamed boat tour",
                    "time_slot": "morning",
                    "estimated_cost": 2500,
                    "category": "activities",
                }
            ],
        },
    ],
    "options": {"flights": [], "hotels": []},
}

SAMPLE_PROFILE = {
    "personality": ["foodie", "history-loving"],
    "hobbies": ["museums", "photography"],
    "food_likes": ["koshari"],
    "food_dislikes": ["very spicy food", "seafood"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "Walking old streets",
    "disliked_last_trip": "Crowds",
}


def test_guard_immutable_destination():
    triggered, msg = check_immutable_fields_guard("Can we change destination to Cairo?")
    assert triggered is True
    assert "Destination cannot be changed" in msg


def test_guard_immutable_currency():
    triggered, msg = check_immutable_fields_guard("Change the currency to USD please")
    assert triggered is True
    assert "Currency cannot be changed" in msg


def test_guard_immutable_travelers():
    triggered, msg = check_immutable_fields_guard("We have 4 travelers now, add 2 people")
    assert triggered is True
    assert "travelers cannot be changed" in msg


def test_guard_budget_without_amount():
    triggered, msg, amount, curr = check_budget_change_guard("Make the budget higher.", "EGP")
    assert triggered is True
    assert "What total budget would you like me to use?" in msg
    assert amount is None


def test_guard_budget_with_wrong_currency():
    triggered, msg, amount, curr = check_budget_change_guard("Set it to 2000 USD", "EGP")
    assert triggered is True
    assert "plan's currency is EGP" in msg


def test_guard_budget_valid():
    triggered, msg, amount, curr = check_budget_change_guard("Set it to 75000 EGP.", "EGP")
    assert triggered is False
    assert amount == 75000
    assert curr == "EGP"


def test_guard_dietary_limits():
    profile = {"dietary_limits": ["halal"], "food_dislikes": []}
    triggered, msg = check_dietary_limits_guard("Add a pork and beer tasting dinner", profile)
    assert triggered is True
    assert "halal diet" in msg


def test_chat_mock_clarification():
    res = chat(
        SAMPLE_PLAN,
        SAMPLE_TRIP,
        SAMPLE_PROFILE,
        [],
        "Make the budget higher.",
        force_mock=True,
    )
    assert res["action"] == "needs_clarification"
    assert "What total budget" in res["message"]
    assert res["plan"] is None
    assert res["trip"] is None


def test_chat_mock_budget_update():
    res = chat(
        SAMPLE_PLAN,
        SAMPLE_TRIP,
        SAMPLE_PROFILE,
        [
            {"role": "user", "content": "Make the budget higher."},
            {"role": "assistant", "content": "What total budget would you like me to use?"},
        ],
        "Set it to 75000 EGP.",
        force_mock=True,
    )
    assert res["action"] == "updated"
    assert res["plan"]["total_budget"] == 75000
    assert res["trip"]["total_budget"] == 75000
    bs = res["plan"]["budget_split"]
    assert bs["hotel"] + bs["food"] + bs["activities"] + bs["transport"] == 75000


def test_chat_mock_seafood_replacement():
    res = chat(
        SAMPLE_PLAN,
        SAMPLE_TRIP,
        SAMPLE_PROFILE,
        [],
        "I don't like seafood. Replace seafood meals with vegetarian options and add one more romantic place.",
        force_mock=True,
    )
    assert res["action"] == "updated"
    assert len(res["changes"]) >= 2
    day1_activities = res["plan"]["itinerary"][0]["activities"]
    assert any("Vegetarian" in a["title"] for a in day1_activities)
