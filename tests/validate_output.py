"""Validate a generated plan against the api-contract.md rules.

Usage:
    python -m tests.validate_output output/plan_output.json
    python -m tests.validate_output                          (uses default path)
"""

import json
import sys
from pathlib import Path
from datetime import date, timedelta

from agent.schemas import FinalPlanResponse

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "output" / "plan_output.json"


def load_plan(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_profile(path: Path = PROJECT_ROOT / "mock-data" / "profile.json") -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------

def check_schema_valid(data: dict) -> tuple[bool, str]:
    """Check 1: Validates against FinalPlanResponse Pydantic model."""
    try:
        FinalPlanResponse.model_validate(data)
        return True, "Schema validation passed"
    except Exception as e:
        return False, f"Schema validation failed: {e}"


def check_budget_sum(data: dict) -> tuple[bool, str]:
    """Check 2: budget_split sums to total_budget."""
    bs = data["budget_split"]
    total = bs["hotel"] + bs["food"] + bs["activities"] + bs["transport"]
    expected = data["total_budget"]
    if total == expected:
        return True, f"Budget sum correct: {total} == {expected}"
    return False, f"Budget sum WRONG: {total} != {expected}"


def check_integer_costs(data: dict) -> tuple[bool, str]:
    """Check 3: All estimated_cost values are integers."""
    bad = []
    for day in data["itinerary"]:
        for act in day["activities"]:
            cost = act["estimated_cost"]
            if not isinstance(cost, int):
                bad.append(f"{act['title']}: {cost} ({type(cost).__name__})")
    if not bad:
        return True, "All costs are integers"
    return False, f"Non-integer costs: {', '.join(bad)}"


def check_date_coverage(data: dict) -> tuple[bool, str]:
    """Check 4: Itinerary covers every date from start to end."""
    start = date.fromisoformat(data["start_date"])
    end = date.fromisoformat(data["end_date"])
    expected_days = (end - start).days + 1
    actual_days = len(data["itinerary"])
    if actual_days == expected_days:
        return True, f"Date coverage correct: {actual_days} days"
    return False, f"Date coverage WRONG: {actual_days} days, expected {expected_days}"


def check_enum_timeslots(data: dict) -> tuple[bool, str]:
    """Check 5: All time_slot values are valid."""
    valid = {"morning", "afternoon", "evening"}
    bad = []
    for day in data["itinerary"]:
        for act in day["activities"]:
            if act["time_slot"] not in valid:
                bad.append(f"{act['title']}: '{act['time_slot']}'")
    if not bad:
        return True, "All time_slots valid"
    return False, f"Invalid time_slots: {', '.join(bad)}"


def check_enum_categories(data: dict) -> tuple[bool, str]:
    """Check 6: All category values are valid."""
    valid = {"hotel", "food", "activities", "transport"}
    bad = []
    for day in data["itinerary"]:
        for act in day["activities"]:
            if act["category"] not in valid:
                bad.append(f"{act['title']}: '{act['category']}'")
    if not bad:
        return True, "All categories valid"
    return False, f"Invalid categories: {', '.join(bad)}"


def check_hotel_cost_zero(data: dict) -> tuple[bool, str]:
    """Check 7: Hotel check-in/check-out activities have cost 0."""
    bad = []
    for day in data["itinerary"]:
        for act in day["activities"]:
            if act["category"] == "hotel" and act["estimated_cost"] != 0:
                bad.append(f"{act['title']}: cost={act['estimated_cost']}")
    if not bad:
        return True, "Hotel activities have cost 0"
    return False, f"Hotel activities with non-zero cost: {', '.join(bad)}"


def check_no_dislikes(data: dict) -> tuple[bool, str]:
    """Check 8: No activity mentions food_dislikes items."""
    try:
        profile = load_profile()
    except FileNotFoundError:
        return True, "Profile not found — skipping dislike check"

    dislikes = [d.lower() for d in profile.get("food_dislikes", [])]
    if not dislikes:
        return True, "No food dislikes to check"

    violations = []
    for day in data["itinerary"]:
        for act in day["activities"]:
            text = (act["title"] + " " + act["description"]).lower()
            for dislike in dislikes:
                if dislike in text:
                    violations.append(f"{act['title']} mentions '{dislike}'")

    if not violations:
        return True, f"No dislikes found ({', '.join(dislikes)})"
    return False, f"Dislike violations: {', '.join(violations)}"


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

ALL_CHECKS = [
    ("schema_valid", check_schema_valid),
    ("budget_sum", check_budget_sum),
    ("integer_costs", check_integer_costs),
    ("date_coverage", check_date_coverage),
    ("enum_timeslots", check_enum_timeslots),
    ("enum_categories", check_enum_categories),
    ("hotel_cost_zero", check_hotel_cost_zero),
    ("no_dislikes", check_no_dislikes),
]


def run_validation(plan_path: Path) -> bool:
    """Run all checks and print results. Returns True if all pass."""
    data = load_plan(plan_path)

    print(f"\n{'=' * 60}")
    print(f"  Validating: {plan_path.name}")
    print(f"{'=' * 60}\n")

    all_passed = True
    for name, check_fn in ALL_CHECKS:
        passed, message = check_fn(data)
        icon = "✅" if passed else "❌"
        print(f"  {icon}  {name:20s} — {message}")
        if not passed:
            all_passed = False

    print(f"\n{'=' * 60}")
    if all_passed:
        print("  ✅ ALL CHECKS PASSED")
    else:
        print("  ❌ SOME CHECKS FAILED")
    print(f"{'=' * 60}\n")

    return all_passed


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT

    if not path.exists():
        print(f"❌ File not found: {path}")
        print("   Run the agent first: python -m agent.main")
        sys.exit(1)

    success = run_validation(path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
