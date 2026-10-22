"""Prompt lines shared by the single-call fallbacks (direct Gemini, direct Groq)."""

import json
from datetime import date, timedelta

from agent.schemas import FinalPlanResponse


def days_rule(trip: dict) -> str:
    """Spell out the day count and every date. Left implicit, models shorten long trips
    (an 8-day request came back with 3 days and failed validation)."""
    start = date.fromisoformat(trip["start_date"])
    end = date.fromisoformat(trip["end_date"])
    num_days = (end - start).days + 1
    dates = ", ".join((start + timedelta(days=i)).isoformat() for i in range(num_days))
    return (
        f"The itinerary MUST contain exactly {num_days} days, numbered 1 to {num_days}, "
        f"with these dates in order: {dates}. Never merge or skip days; keep descriptions short "
        f"so every day fits."
    )


def compact_schema() -> str:
    """The plan schema without indentation: same content, far fewer input tokens."""
    return json.dumps(FinalPlanResponse.model_json_schema(), separators=(",", ":"))
