"""Sprint 3 backend tasks on POST /api/trips: language field (Y9) and no database lock while
the plan is generated (Y6)."""

import pytest
from sqlalchemy.orm import sessionmaker

from app.database import Base, make_engine
from app.deps import get_db
from app.main import app
from app.models import Plan, Profile, User
from app.routers import trips as trips_router
from app.security import create_access_token
from agent.main import generate_plan_from_dict

TRIP = {
    "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
    "start_date": "2026-11-10",
    "end_date": "2026-11-12",
    "total_budget": 60000,
    "currency": "EGP",
    "travelers": 2,
}


def offline_plan(profile, trip, **_):
    """The real deterministic mock tier, so no AI key or network is used."""
    return generate_plan_from_dict(profile, trip, force_tier=3)


def add_user_with_profile(session, email="sara@example.com"):
    user = User(email=email, password_hash="$2b$12$placeholderhashnotarealpassword")
    session.add(user)
    session.flush()
    session.add(Profile(user_id=user.id, personality=["calm"], hobbies=["beaches"],
                        food_likes=["koshari"], food_dislikes=[], dietary_limits=["halal"]))
    session.commit()
    return user, {"Authorization": f"Bearer {create_access_token(user.id)}"}


# --- Y9: optional language field ----------------------------------------------

@pytest.mark.parametrize("language", ["en", "ar"])
def test_language_is_stored_and_passed_to_the_agent(client, session, monkeypatch, language):
    seen = {}

    def capture(profile, trip, **kwargs):
        seen["trip"] = trip
        return offline_plan(profile, trip)

    monkeypatch.setattr(trips_router, "generate_plan_from_dict", capture)
    _, headers = add_user_with_profile(session)

    response = client.post("/api/trips", json={**TRIP, "language": language}, headers=headers)
    assert response.status_code == 201, response.text
    assert seen["trip"]["language"] == language
    plan = session.get(Plan, response.json()["plan"]["id"])
    assert plan.search_context["language"] == language


def test_language_defaults_to_english(client, session, monkeypatch):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    _, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json=TRIP, headers=headers)
    assert response.status_code == 201, response.text
    assert session.get(Plan, response.json()["plan"]["id"]).search_context["language"] == "en"


@pytest.mark.parametrize("language", ["fr", "AR", ""])
def test_other_languages_are_rejected_with_400(client, session, monkeypatch, language):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    _, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json={**TRIP, "language": language}, headers=headers)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# --- Y6: the database must not stay locked while the AI is working ------------

def test_database_is_not_locked_while_the_plan_is_generated(tmp_path, monkeypatch):
    """While the (slow) agent runs, another request must still be able to write.

    Uses a real SQLite file in WAL mode, like the live server: only one writer at a time.
    """
    db_file = tmp_path / "travel_planner.db"
    engine = make_engine(f"sqlite:///{db_file}")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        with TestSession() as s:
            yield s

    other_writer = make_engine(f"sqlite:///{db_file}")
    result = {}

    def slow_generation_with_concurrent_signup(profile, trip, **_):
        # A second user signs up while the plan is being generated.
        with other_writer.connect() as conn:
            conn.exec_driver_sql("PRAGMA busy_timeout=300")  # fail fast instead of waiting 5 s
            try:
                conn.exec_driver_sql(
                    "INSERT INTO users (id, email, password_hash, created_at) "
                    "VALUES ('user_concurrent0000', 'other@example.com', 'x', '2026-10-17 10:00:00')"
                )
                conn.commit()
                result["concurrent_write"] = "ok"
            except Exception as exc:  # sqlite3.OperationalError: database is locked
                result["concurrent_write"] = f"failed: {exc}"
        return offline_plan(profile, trip)

    monkeypatch.setattr(trips_router, "generate_plan_from_dict", slow_generation_with_concurrent_signup)
    app.dependency_overrides[get_db] = override_get_db
    try:
        from fastapi.testclient import TestClient
        with TestSession() as s:
            _, headers = add_user_with_profile(s)
        response = TestClient(app).post("/api/trips", json=TRIP, headers=headers)
    finally:
        app.dependency_overrides.clear()
        other_writer.dispose()
        engine.dispose()

    assert response.status_code == 201, response.text
    assert result["concurrent_write"] == "ok", result["concurrent_write"]


def test_failed_generation_leaves_no_orphan_trip(client, session, monkeypatch):
    def broken_agent(profile, trip, **_):
        raise RuntimeError("all tiers failed")

    monkeypatch.setattr(trips_router, "generate_plan_from_dict", broken_agent)
    user, headers = add_user_with_profile(session)
    response = client.post("/api/trips", json=TRIP, headers=headers)
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GENERATION_FAILED"
    assert client.get("/api/trips", headers=headers).json()["trips"] == []
