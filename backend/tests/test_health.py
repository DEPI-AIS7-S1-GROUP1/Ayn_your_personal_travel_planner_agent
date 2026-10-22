from sqlalchemy.orm import sessionmaker

from app.database import make_engine
from app.deps import get_db
from app.main import app


def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok" and body["database"] == "ok"
    assert set(body["ai_keys"]) == {"gemini", "groq", "tavily"}


def test_health_reports_ai_keys_as_yes_or_no_without_values(client, monkeypatch):
    fake_gemini = "AIza-test-value-that-must-never-be-returned"
    monkeypatch.setenv("GEMINI_API_KEY", fake_gemini)
    monkeypatch.setenv("GROQ_API_KEY", "gsk_your_default_key_here")  # placeholder from .env.example
    for name in ("GROQ_API_KEY_CONTEXT", "GROQ_API_KEY_SEARCH", "GROQ_API_KEY_PLANNER"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("TAVILY_API_KEY", "")

    response = client.get("/api/health")
    assert response.json()["ai_keys"] == {"gemini": "yes", "groq": "no", "tavily": "no"}
    assert fake_gemini not in response.text


def test_health_counts_a_per_agent_groq_key(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY_PLANNER", "gsk-test-planner-key")
    assert client.get("/api/health").json()["ai_keys"]["groq"] == "yes"


def test_health_reports_unreachable_database(client):
    broken = sessionmaker(bind=make_engine("sqlite:////nonexistent-dir/travel_planner.db"))

    def broken_db():
        with broken() as session:
            yield session

    app.dependency_overrides[get_db] = broken_db
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_unknown_url_uses_contract_error_format(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
