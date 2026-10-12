import os

# Must be set before the app is imported: config reads them at import time.
# Test-only values; the real secret lives only in your local .env.
os.environ["AUTH_SECRET_KEY"] = "test-only-secret-key-not-used-anywhere-real-0123456789"
os.environ["DATABASE_URL"] = "sqlite://"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import models  # noqa: E402,F401  (registers the tables on Base)
from app.database import Base, make_engine  # noqa: E402
from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def engine():
    """A fresh in-memory SQLite database for each test.

    StaticPool shares one connection, so the API (which TestClient runs on another
    thread) and the test see the same in-memory database.
    """
    engine = make_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(engine):
    """HTTP client for the real app, wired to the test database."""
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
