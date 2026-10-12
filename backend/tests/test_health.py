from sqlalchemy.orm import sessionmaker

from app.database import make_engine
from app.deps import get_db
from app.main import app


def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


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
