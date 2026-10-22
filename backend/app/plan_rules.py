"""Rules every saved plan must follow (contract §3.3–§3.6).

Shared by PUT /plans/{id} (user edits) and POST /plans/{id}/chat (agent edits), so a plan
written by the agent is checked exactly like one edited by hand. Each check raises
PlanRuleError with a message for the client; the router decides the status code.
"""

from datetime import date, timedelta
from typing import Any

CATEGORIES = ("hotel", "food", "activities", "transport")
TIME_SLOTS = {"morning", "afternoon", "evening"}
MAX_TRIP_DAYS = 14


class PlanRuleError(ValueError):
    """A plan or trip breaks a contract rule."""


def check_trip_dates(start: date, end: date, *, today: date | None = None) -> None:
    """Contract §3.3: start not in the past (when today is given), end on or after start, 14 days max."""
    if today is not None and start < today:
        raise PlanRuleError("start_date cannot be in the past.")
    if start > end:
        raise PlanRuleError("end_date must be on or after start_date.")
    if (end - start).days + 1 > MAX_TRIP_DAYS:
        raise PlanRuleError(f"Trip length cannot exceed {MAX_TRIP_DAYS} days.")


def check_budget_split(budget_split: Any, total_budget: int) -> dict[str, int]:
    """Contract §3.4: exactly the four categories, non-negative integers, summing to total_budget."""
    if not isinstance(budget_split, dict) or set(budget_split) != set(CATEGORIES):
        raise PlanRuleError("budget_split must have exactly hotel, food, activities and transport.")
    for category in CATEGORIES:
        value = budget_split[category]
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise PlanRuleError(f"budget_split.{category} must be a non-negative integer.")
    total = sum(budget_split[c] for c in CATEGORIES)
    if total != total_budget:
        raise PlanRuleError(f"budget_split must sum to total_budget ({total_budget}). Got {total}.")
    return {c: budget_split[c] for c in CATEGORIES}


def check_itinerary(itinerary: Any, start: date, end: date, budget_split: dict[str, int]) -> list[dict]:
    """Contract §3.5–§3.6: one entry per day in order, valid activities, each category within its budget.

    Returns a cleaned copy holding only the contract fields. Activities without an id get one.
    """
    num_days = (end - start).days + 1
    if not isinstance(itinerary, list) or len(itinerary) != num_days:
        raise PlanRuleError(f"Itinerary must contain exactly {num_days} days covering {start} to {end}.")

    spent = dict.fromkeys(CATEGORIES, 0)
    cleaned = []
    for i, day in enumerate(itinerary):
        if not isinstance(day, dict):
            raise PlanRuleError(f"Day {i + 1} has an invalid format.")
        expected_date = (start + timedelta(days=i)).isoformat()
        if day.get("day") != i + 1:
            raise PlanRuleError(f"Day index mismatch at position {i}: expected day {i + 1}, got {day.get('day')}.")
        if day.get("date") != expected_date:
            raise PlanRuleError(f"Day {i + 1} date gap or mismatch: expected {expected_date}, got {day.get('date')}.")

        activities = day.get("activities")
        if not isinstance(activities, list) or not activities:
            raise PlanRuleError(f"Day {i + 1} must contain at least 1 activity.")

        cleaned_activities = []
        for j, act in enumerate(activities):
            if not isinstance(act, dict):
                raise PlanRuleError(f"Invalid activity format on day {i + 1}.")
            title = act.get("title", "")
            if act.get("time_slot") not in TIME_SLOTS:
                raise PlanRuleError(
                    f"Day {i + 1} activity '{title}' has invalid time_slot '{act.get('time_slot')}'. "
                    "Must be morning, afternoon, or evening."
                )
            if act.get("category") not in CATEGORIES:
                raise PlanRuleError(
                    f"Day {i + 1} activity '{title}' has invalid category '{act.get('category')}'. "
                    "Must be hotel, food, activities, or transport."
                )
            cost = act.get("estimated_cost", 0)
            if isinstance(cost, bool) or not isinstance(cost, int) or cost < 0:
                raise PlanRuleError(f"Day {i + 1} activity '{title}' estimated_cost must be a non-negative integer.")
            spent[act["category"]] += cost
            cleaned_activities.append({
                "id": act.get("id") or f"act_{i + 1}_{j + 1}",
                "title": title,
                "description": act.get("description", ""),
                "time_slot": act["time_slot"],
                "estimated_cost": cost,
                "category": act["category"],
            })
        cleaned.append({"day": i + 1, "date": expected_date, "activities": cleaned_activities})

    for category in CATEGORIES:
        if spent[category] > budget_split[category]:
            raise PlanRuleError(
                f"Total estimated cost for category '{category}' ({spent[category]}) "
                f"exceeds allocated budget ({budget_split[category]})."
            )
    return cleaned
