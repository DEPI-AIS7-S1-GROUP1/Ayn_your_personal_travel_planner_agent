"""Demo data that survives a reset (Y4) and Arabic text that round-trips unchanged (Y10)."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import func, select, text

from app.models import ChatMessage, Plan, Profile, User
from app.routers import trips as trips_router
from app.security import create_access_token
from agent.main import generate_plan_from_dict
from scripts.seed_demo import DEMO_USERS, seed_demo

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEMO_PASSWORD = "demo-password-for-tests"

ARABIC_PROFILE = {
    "personality": ["history-loving"],
    "hobbies": ["museums"],
    "food_likes": ["كشري", "ملوخية"],
    "food_dislikes": ["الأكل الحار جدًا"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "زيارة المعابد والمشي في الأسواق القديمة.",
    "disliked_last_trip": "الزحمة والانتظار الطويل في المواصلات.",
}


def offline_plan(profile, trip, **_):
    return generate_plan_from_dict(profile, trip, force_tier=3)


# --- Y4: seed_demo.py -------------------------------------------------------------

def test_seed_creates_the_demo_accounts_once(session, monkeypatch):
    monkeypatch.setenv("DEMO_USER_PASSWORD", DEMO_PASSWORD)
    assert seed_demo(session) == [d["email"] for d in DEMO_USERS]
    assert seed_demo(session) == []  # second run changes nothing
    assert session.scalar(select(func.count()).select_from(User)) == len(DEMO_USERS)
    assert session.scalar(select(func.count()).select_from(Profile)) == len(DEMO_USERS)
    plans = session.scalars(select(Plan)).all()
    assert len(plans) == 1 and plans[0].status == "confirmed"


def test_seeded_demo_user_can_log_in(client, session, monkeypatch):
    monkeypatch.setenv("DEMO_USER_PASSWORD", DEMO_PASSWORD)
    seed_demo(session)
    for demo in DEMO_USERS:
        response = client.post("/api/login", json={"email": demo["email"], "password": DEMO_PASSWORD})
        assert response.status_code == 200, response.text


def test_seed_refuses_to_run_without_a_password(session, monkeypatch):
    monkeypatch.delenv("DEMO_USER_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="DEMO_USER_PASSWORD"):
        seed_demo(session)


def test_demo_login_still_works_after_the_database_is_wiped(tmp_path):
    """Start the real app twice on a file database, deleting the file in between (a host reset)."""
    db_file = tmp_path / "travel_planner.db"
    script = (
        "from fastapi.testclient import TestClient\n"
        "from app.main import app\n"
        "with TestClient(app) as c:\n"  # 'with' runs the startup code, like a real server start
        f"    r = c.post('/api/login', json={{'email': '{DEMO_USERS[0]['email']}', 'password': '{DEMO_PASSWORD}'}})\n"
        "    print('LOGIN', r.status_code)\n"
    )
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_file}", "SEED_DEMO_DATA": "true",
           "DEMO_USER_PASSWORD": DEMO_PASSWORD,
           "AUTH_SECRET_KEY": "test-only-secret-key-not-used-anywhere-real-0123456789"}
    for attempt in ("first start", "start after the reset"):
        result = subprocess.run([sys.executable, "-c", script], cwd=BACKEND_DIR, env=env,
                                capture_output=True, text=True, timeout=180)
        assert "LOGIN 200" in result.stdout, (attempt, result.stdout[-500:], result.stderr[-1500:])
        db_file.unlink()  # the host wipes the database


def test_old_secret_placeholder_is_rejected():
    env = {**os.environ, "AUTH_SECRET_KEY": "generate_with_python_secrets_token_hex_32", "DATABASE_URL": "sqlite://"}
    result = subprocess.run([sys.executable, "-c", "import app.main"], cwd=BACKEND_DIR, env=env,
                            capture_output=True, text=True, timeout=180)
    assert result.returncode != 0 and "placeholder" in result.stderr


# --- Y10: Arabic text survives a save and a read ----------------------------------

@pytest.fixture
def arabic_user(client, session):
    user = User(email="arabic@example.com", password_hash="$2b$12$placeholderhashnotarealpassword")
    session.add(user)
    session.commit()
    headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}
    assert client.put("/api/profile", json=ARABIC_PROFILE, headers=headers).status_code == 200
    return headers


def test_arabic_survey_answers_round_trip(client, session, arabic_user):
    assert client.get("/api/profile", headers=arabic_user).json()["profile"] == ARABIC_PROFILE
    # Also read the raw database value, as another program would.
    raw = session.execute(text("SELECT food_likes, liked_last_trip FROM profiles")).one()
    assert json.loads(raw[0]) == ARABIC_PROFILE["food_likes"]
    assert raw[1] == ARABIC_PROFILE["liked_last_trip"]
    assert "?" not in raw[1]


def test_arabic_trip_and_plan_edit_round_trip(client, session, arabic_user, monkeypatch):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    trip = {"destination": {"city": "شرم الشيخ", "country": "Egypt"}, "start_date": "2026-11-10",
            "end_date": "2026-11-11", "total_budget": 30000, "currency": "EGP", "travelers": 2,
            "language": "ar"}
    created = client.post("/api/trips", json=trip, headers=arabic_user)
    assert created.status_code == 201, created.text
    assert client.get("/api/trips", headers=arabic_user).json()["trips"][0]["destination"]["city"] == "شرم الشيخ"

    plan = created.json()["plan"]
    itinerary = plan["itinerary"]
    itinerary[0]["activities"][0]["title"] = "جولة في السوق القديم"
    itinerary[0]["activities"][0]["description"] = "مشي هادئ وتصوير، مع غداء كشري."
    edited = client.put(f"/api/plans/{plan['id']}", json={"itinerary": itinerary}, headers=arabic_user)
    assert edited.status_code == 200, edited.text
    saved = client.get(f"/api/plans/{plan['id']}", headers=arabic_user).json()
    saved = saved.get("plan", saved)
    assert saved["itinerary"][0]["activities"][0]["title"] == "جولة في السوق القديم"
    assert saved["itinerary"][0]["activities"][0]["description"] == "مشي هادئ وتصوير، مع غداء كشري."


def test_arabic_chat_message_is_stored_unchanged(client, session, arabic_user, monkeypatch):
    monkeypatch.setattr(trips_router, "generate_plan_from_dict", offline_plan)
    trip = {"destination": {"city": "Luxor", "country": "Egypt"}, "start_date": "2026-11-10",
            "end_date": "2026-11-11", "total_budget": 30000, "currency": "EGP", "travelers": 2}
    plan_id = client.post("/api/trips", json=trip, headers=arabic_user).json()["plan"]["id"]

    message = "خلّي اليوم التاني أهدى من فضلك"
    response = client.post(f"/api/plans/{plan_id}/chat", json={"message": message}, headers=arabic_user)
    assert response.status_code == 200, response.text
    stored = session.scalars(select(ChatMessage.content).where(ChatMessage.role == "user")).all()
    assert stored == [message]
