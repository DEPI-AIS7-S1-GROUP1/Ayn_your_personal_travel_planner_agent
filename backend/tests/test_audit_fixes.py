"""Fixes from the Oct 20 project audit (Ayn_Project_Audit.pdf, findings F2–F17).

Each test fails on the code before the fix and passes after it.
"""

import copy
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from agent.agents import chat_agent
from agent.fallbacks.prompt_rules import days_rule
from agent.main import generate_plan_from_dict
from app.database import Base, make_engine
from app.deps import get_db
from app.main import app
from app.models import ChatMessage, Conversation, Plan
from app.routers import plans as plans_router
from app.routers import trips as trips_router
from test_plans import BUDGET_SPLIT, ITINERARY, create_test_setup
from test_trips_sprint3 import TRIP, add_user_with_profile, offline_plan


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def agent_update(plan_dict, trip_dict, **plan_changes):
    """A well-formed "updated" reply, built from the current plan."""
    new_plan = copy.deepcopy(plan_dict)
    new_plan.update(plan_changes)
    return {"action": "updated", "message": "Done.", "changes": [], "plan": new_plan, "trip": dict(trip_dict)}


# --- F2: the chat must not hold a write lock while the agent works ------------

def test_database_is_not_locked_while_the_chat_agent_answers(tmp_path, monkeypatch):
    db_file = tmp_path / "travel_planner.db"
    engine = make_engine(f"sqlite:///{db_file}")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        with TestSession() as s:
            yield s

    other_writer = make_engine(f"sqlite:///{db_file}")
    result = {}

    def slow_agent_with_concurrent_signup(**kwargs):
        with other_writer.connect() as conn:
            conn.exec_driver_sql("PRAGMA busy_timeout=300")
            try:
                conn.exec_driver_sql(
                    "INSERT INTO users (id, email, password_hash, created_at) "
                    "VALUES ('user_concurrent0001', 'other@example.com', 'x', '2026-10-20 10:00:00')"
                )
                conn.commit()
                result["concurrent_write"] = "ok"
            except Exception as exc:
                result["concurrent_write"] = f"failed: {exc}"
        return {"action": "needs_clarification", "message": "Which day?", "changes": [], "plan": None, "trip": None}

    monkeypatch.setattr(plans_router, "agent_chat", slow_agent_with_concurrent_signup)
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestSession() as s:
            _, _, plan, token = create_test_setup(s)
            plan_id = plan.id
        response = TestClient(app).post(f"/api/plans/{plan_id}/chat", json={"message": "Change a day"},
                                        headers=auth(token))
        with TestSession() as s:
            saved = s.query(ChatMessage).count()
    finally:
        app.dependency_overrides.clear()
        other_writer.dispose()
        engine.dispose()

    assert response.status_code == 200, response.text
    assert result["concurrent_write"] == "ok", result["concurrent_write"]
    assert saved == 2  # the user's message and the reply are still both saved


# --- F4: an agent reply is checked like a manual edit -------------------------

@pytest.mark.parametrize("bad_change", [
    {"budget_split": {"hotel": 40000, "food": 15000, "activities": 15000, "transport": -10000}},
    {"itinerary": ITINERARY[:2]},  # 2 days for a 3-day trip
    {"budget_split": {"hotel": 60000, "food": 0, "activities": 0, "transport": 0}},  # food over its share
])
def test_invalid_agent_plan_is_rejected_and_nothing_is_saved(client, session, monkeypatch, bad_change):
    _, trip, plan, token = create_test_setup(session)

    def bad_agent(plan, trip, **_):
        return agent_update(plan, trip, **bad_change)

    monkeypatch.setattr(plans_router, "agent_chat", bad_agent)
    response = client.post(f"/api/plans/{plan.id}/chat", json={"message": "Make it calmer"}, headers=auth(token))

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GENERATION_FAILED"
    session.expire_all()
    assert session.get(Plan, plan.id).budget_split == BUDGET_SPLIT
    assert session.query(ChatMessage).count() == 0


def test_agent_cannot_move_the_start_date_into_the_past(client, session, monkeypatch):
    _, trip, plan, token = create_test_setup(session)

    def past_agent(plan, trip, **_):
        reply = agent_update(plan, trip)
        reply["trip"]["start_date"] = "2020-01-01"
        return reply

    monkeypatch.setattr(plans_router, "agent_chat", past_agent)
    response = client.post(f"/api/plans/{plan.id}/chat", json={"message": "Make it 3 days"}, headers=auth(token))
    assert response.status_code == 502


def test_valid_agent_update_is_saved(client, session, monkeypatch):
    _, trip, plan, token = create_test_setup(session)
    new_split = {"hotel": 30000, "food": 12000, "activities": 10000, "transport": 8000}

    def good_agent(plan, trip, **_):
        return agent_update(plan, trip, budget_split=new_split)

    monkeypatch.setattr(plans_router, "agent_chat", good_agent)
    response = client.post(f"/api/plans/{plan.id}/chat", json={"message": "More for the hotel"}, headers=auth(token))
    assert response.status_code == 200, response.text
    assert response.json()["plan"]["budget_split"] == new_split
    session.expire_all()
    assert session.get(Plan, plan.id).budget_split == new_split


# The agent-side check (before the backend sees the reply).

def _chat_inputs():
    plan = {"total_budget": 60000, "budget_split": dict(BUDGET_SPLIT), "itinerary": copy.deepcopy(ITINERARY)}
    trip = {"total_budget": 60000, "start_date": "2026-11-10", "end_date": "2026-11-12", "currency": "EGP"}
    return plan, trip


def test_llm_reply_that_changes_the_budget_unasked_is_discarded():
    plan, trip = _chat_inputs()
    reply = {"plan": {**copy.deepcopy(plan), "total_budget": 90000}, "trip": {**trip, "total_budget": 90000}}
    assert chat_agent.validate_llm_update(reply, plan, trip, "Add a museum", requested_total=None) is None


def test_llm_reply_with_requested_budget_is_kept_and_split_fixed():
    plan, trip = _chat_inputs()
    new_plan = copy.deepcopy(plan)
    new_plan["budget_split"] = {"hotel": 30000, "food": 15000, "activities": 15000, "transport": 10000}  # 70000
    reply = {"plan": new_plan, "trip": {**trip, "total_budget": 75000}}
    checked = chat_agent.validate_llm_update(reply, plan, trip, "Set it to 75000 EGP", requested_total=75000)
    assert checked is not None
    new_plan, new_trip = checked
    assert sum(new_plan["budget_split"].values()) == 75000
    assert min(new_plan["budget_split"].values()) >= 0
    assert new_trip["total_budget"] == 75000


def test_llm_reply_that_moves_dates_unasked_is_discarded():
    plan, trip = _chat_inputs()
    reply = {"plan": copy.deepcopy(plan), "trip": {**trip, "start_date": "2026-11-11", "end_date": "2026-11-13"}}
    assert chat_agent.validate_llm_update(reply, plan, trip, "Make day 2 calmer", requested_total=None) is None


def test_llm_reply_with_wrong_day_count_is_discarded():
    plan, trip = _chat_inputs()
    short = copy.deepcopy(plan)
    short["itinerary"] = short["itinerary"][:2]
    assert chat_agent.validate_llm_update({"plan": short, "trip": trip}, plan, trip, "Calmer", None) is None


def test_llm_reply_that_cannot_be_balanced_without_negatives_is_discarded():
    plan, trip = _chat_inputs()
    bad = copy.deepcopy(plan)
    bad["budget_split"] = {"hotel": 0, "food": 0, "activities": 0, "transport": -5}
    assert chat_agent.validate_llm_update({"plan": bad, "trip": trip}, plan, trip, "Calmer", None) is None


# --- F13: conversation ids --------------------------------------------------------

def test_unknown_conversation_id_is_404(client, session):
    _, _, plan, token = create_test_setup(session)
    response = client.post(f"/api/plans/{plan.id}/chat",
                           json={"conversation_id": "chat_doesnotexist00", "message": "Hi"}, headers=auth(token))
    assert response.status_code == 404
    assert session.query(Conversation).count() == 0


# --- F11: budget_split in PUT /plans -----------------------------------------------

@pytest.mark.parametrize("split", [
    {"hotel": "a", "food": 12000, "activities": 14000, "transport": 10000},
    {"hotel": 34000, "food": 12000, "activities": 14000, "transport": -10000},
    {"hotel": 24000, "food": 12000, "activities": 14000, "transport": 5000, "tips": 5000},
])
def test_bad_budget_split_is_400_not_500(client, session, split):
    _, _, plan, token = create_test_setup(session)
    response = client.put(f"/api/plans/{plan.id}", json={"budget_split": split}, headers=auth(token))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_new_split_cannot_drop_below_existing_activity_costs(client, session):
    _, _, plan, token = create_test_setup(session)
    # Food activities already cost 900, so a food share of 0 breaks contract §3.5.
    split = {"hotel": 24900, "food": 0, "activities": 25100, "transport": 10000}
    response = client.put(f"/api/plans/{plan.id}", json={"budget_split": split}, headers=auth(token))
    assert response.status_code == 400
    assert "food" in response.json()["error"]["message"]


# --- F7 / F8: enums and length limits ------------------------------------------

PROFILE = {"personality": ["foodie"], "hobbies": ["museums"], "food_likes": [], "food_dislikes": [],
           "dietary_limits": [], "liked_last_trip": "", "disliked_last_trip": ""}


@pytest.mark.parametrize("change", [
    {"personality": ["Foodie"]},
    {"hobbies": ["skydiving"]},
    {"dietary_limits": ["keto"]},
    {"food_likes": ["x" * 51]},
    {"liked_last_trip": "x" * 501},
])
def test_profile_rejects_values_outside_the_contract(client, session, change):
    _, headers = add_user_with_profile(session)
    response = client.put("/api/profile", json={**PROFILE, **change}, headers=headers)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_profile_with_contract_values_is_saved(client, session):
    _, headers = add_user_with_profile(session)
    response = client.put("/api/profile", json={**PROFILE, "food_likes": ["koshari"]}, headers=headers)
    assert response.status_code == 200, response.text


@pytest.mark.parametrize("city", ["", "   ", "x" * 81])
def test_trip_city_must_be_present_and_short(client, session, monkeypatch, city):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    _, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json={**TRIP, "destination": {"city": city, "country": "Egypt"}},
                           headers=headers)
    assert response.status_code == 400


# --- F6 / F12: tier is recorded; provider errors stay in the log -------------------

def test_generation_tier_is_saved_with_the_plan(client, session, monkeypatch):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    _, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json=TRIP, headers=headers)
    assert response.status_code == 201, response.text
    assert response.json()["plan"]["search_context"] == {"language": "en", "tier": "mock_unverified"}


def test_provider_error_details_are_not_sent_to_the_client(client, session, monkeypatch):
    def leaky_agent(profile, trip, **_):
        raise RuntimeError("429 Request too large for model in organization org_SECRET123")

    monkeypatch.setattr(trips_router, "generate_plan_from_dict", leaky_agent)
    _, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json=TRIP, headers=headers)
    assert response.status_code == 502
    assert "org_SECRET123" not in response.text


# --- F5 / F17: agent output ---------------------------------------------------------

def test_days_rule_lists_every_date():
    rule = days_rule({"start_date": "2026-11-10", "end_date": "2026-11-17"})
    assert "exactly 8 days" in rule
    assert "2026-11-10" in rule and "2026-11-17" in rule


def test_empty_flights_and_hotels_are_filled(monkeypatch):
    from agent import main as agent_main

    profile = {"personality": ["calm"], "hobbies": ["beaches"], "food_likes": [], "food_dislikes": [],
               "dietary_limits": []}
    trip = {**TRIP, "start_date": date(2026, 11, 10).isoformat()}

    def groq_without_options(p, t, restaurants=None):
        plan = agent_main.build_mock_plan(p, t)
        plan.options.flights = []
        plan.options.hotels = []
        return plan

    monkeypatch.setattr(agent_main, "_run_tier_with_timeout", lambda fn, *args, **kw: groq_without_options(*args))
    plan = generate_plan_from_dict(profile, trip, force_tier=2)
    assert plan.options.flights and plan.options.hotels
    assert plan.search_context == "groq_unverified+mock_options"


def test_tiers_without_keys_are_skipped_without_starting_a_worker(monkeypatch):
    """No GEMINI/GROQ key (conftest empties them): go straight to the mock, no ~15 s process start."""
    from agent import main as agent_main

    def no_worker(*args, **kwargs):
        raise AssertionError("a worker process was started for a tier without a key")

    monkeypatch.setattr(agent_main, "_run_tier_with_timeout", no_worker)
    profile = {"personality": ["calm"], "hobbies": ["beaches"], "food_likes": [], "food_dislikes": [],
               "dietary_limits": []}
    plan = generate_plan_from_dict(profile, TRIP)
    assert plan.search_context == "mock_unverified"
