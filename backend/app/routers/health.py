import os

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import ApiError

router = APIRouter(tags=["health"])

# Each AI provider and the environment variables that can configure it.
AI_PROVIDER_KEYS = {
    "gemini": ["GEMINI_API_KEY"],
    "groq": ["GROQ_API_KEY", "GROQ_API_KEY_CONTEXT", "GROQ_API_KEY_SEARCH", "GROQ_API_KEY_PLANNER"],
    "tavily": ["TAVILY_API_KEY"],
}


def _is_configured(value: str | None) -> bool:
    """A key counts only if it is set and is not a placeholder copied from .env.example."""
    value = (value or "").strip()
    return bool(value) and "your" not in value.lower()


def ai_keys_status() -> dict[str, str]:
    """"yes" / "no" per provider. The key values themselves are never returned."""
    return {
        provider: "yes" if any(_is_configured(os.getenv(name)) for name in names) else "no"
        for provider, names in AI_PROVIDER_KEYS.items()
    }


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    """Is the server up, can it reach the database, and which AI keys are configured?"""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise ApiError(503, "SERVICE_UNAVAILABLE", "The database is not reachable.")
    return {"status": "ok", "database": "ok", "ai_keys": ai_keys_status()}
