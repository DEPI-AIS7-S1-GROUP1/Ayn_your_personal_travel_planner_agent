import pytest
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registers the tables on Base)
from app.database import Base, make_engine


@pytest.fixture
def engine():
    """A fresh in-memory SQLite database for each test."""
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session
