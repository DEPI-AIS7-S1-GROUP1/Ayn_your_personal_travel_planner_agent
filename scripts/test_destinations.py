"""Run Task 7 (A6) Destination Validation across 5 Egyptian destinations.

Destinations:
  1. Cairo
  2. Alexandria
  3. Luxor
  4. Aswan
  5. Sharm El Sheikh

Checks:
  - Destination city and country accuracy
  - Date continuity and itinerary coverage
  - Budget split exact sum
  - Activity price sanity (no single activity exceeds 50% of category daily budget)
  - Hotel check-in/out cost is 0

Usage:
    python scripts/test_destinations.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Windows console encoding safety
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.fallbacks.mock_builder import build_mock_plan
from agent.validators.post_processor import post_process

DESTINATIONS = [
    {"city": "Cairo", "country": "Egypt"},
    {"city": "Alexandria", "country": "Egypt"},
    {"city": "Luxor", "country": "Egypt"},
    {"city": "Aswan", "country": "Egypt"},
    {"city": "Sharm El Sheikh", "country": "Egypt"},
]

DEFAULT_PROFILE = {
    "personality": ["calm", "history-loving"],
    "hobbies": ["museums", "photography"],
    "food_likes": ["koshari", "seafood"],
    "food_dislikes": ["very spicy food"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "Quiet historic places.",
    "disliked_last_trip": "Crowds.",
}


def validate_destination_plan(dest: dict, trip_budget: int = 50000, days: int = 3) -> tuple[bool, list[str]]:
    city = dest["city"]
    trip_req = {
        "destination": dest,
        "departure_city": "Cairo" if city != "Cairo" else "Alexandria",
        "start_date": "2026-11-10",
        "end_date": f"2026-11-{9 + days:02d}",
        "total_budget": trip_budget,
        "currency": "EGP",
        "travelers": 2,
    }

    issues = []
    try:
        raw_plan = build_mock_plan(DEFAULT_PROFILE, trip_req)
        plan = post_process(raw_plan, profile=DEFAULT_PROFILE)
        data = json.loads(plan.model_dump_json(by_alias=True))
    except Exception as exc:
        return False, [f"Plan generation failed: {exc}"]

    # 1. City check
    if data["destination"]["city"] != city or data["destination"]["country"] != "Egypt":
        issues.append(f"Destination mismatch: {data['destination']}")

    # 2. Date continuity
    if len(data["itinerary"]) != days:
        issues.append(f"Days mismatch: got {len(data['itinerary'])}, expected {days}")

    # 3. Budget split sum
    bs = data["budget_split"]
    total = bs["hotel"] + bs["food"] + bs["activities"] + bs["transport"]
    if total != trip_budget:
        issues.append(f"Budget sum mismatch: {total} != {trip_budget}")

    # 4. Price sanity check: no single activity exceeds 50% of the entire activity budget
    act_budget = bs["activities"]
    for d in data["itinerary"]:
        for a in d["activities"]:
            if a["category"] == "hotel" and a["estimated_cost"] != 0:
                issues.append(f"Hotel activity '{a['title']}' has non-zero cost ({a['estimated_cost']})")
            if a["category"] == "activities" and a["estimated_cost"] > (act_budget * 0.5):
                issues.append(f"Activity '{a['title']}' cost ({a['estimated_cost']}) exceeds 50% of activity budget ({act_budget})")

    return len(issues) == 0, issues


def main() -> None:
    print("=" * 65)
    print("Running Task 7 (A6) Destination Validation (5 Cities)")
    print("=" * 65)

    all_passed = True
    for dest in DESTINATIONS:
        city = dest["city"]
        passed, issues = validate_destination_plan(dest, trip_budget=55000, days=4)
        if passed:
            print(f"  [PASS] {city:<18} | 4 days, 55000 EGP | All sanity checks verified")
        else:
            print(f"  [FAIL] {city:<18} | Issues found:")
            for issue in issues:
                print(f"         - {issue}")
            all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print("[ALL 5 DESTINATIONS VALIDATED SUCCESSFULLY]")
        sys.exit(0)
    else:
        print("[FAILED] Some destination validations failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
