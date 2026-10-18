"""Run A5 quality check suite: 3 runs x 2 profiles.

Verifies:
  - 8 standard contract & schema checks for every plan
  - Activity density: calm profile avg < adventurous profile avg
  - 100% (3/3) pass rate across all runs
  - With --language ar: titles/descriptions are Arabic (A10/A11)

Usage:
    python scripts/run_quality_checks.py
    python scripts/run_quality_checks.py --language ar
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

import argparse

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.arabic import contains_arabic, normalize_arabic
from agent.agents.chat_agent import check_dietary_limits_guard, check_immutable_fields_guard
from agent.fallbacks.mock_builder import build_mock_plan
from agent.validators.post_processor import post_process
from tests.validate_output import ALL_CHECKS

TRIP = {
    "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
    "start_date": "2026-11-10",
    "end_date": "2026-11-14",
    "total_budget": 60000,
    "currency": "EGP",
    "travelers": 2,
}

PROFILES = {
    "calm": {
        "personality": ["calm"],
        "hobbies": ["museums"],
        "food_likes": [],
        "food_dislikes": ["very spicy food"],
        "dietary_limits": ["halal"],
        "liked_last_trip": "",
        "disliked_last_trip": "",
    },
    "adventurous": {
        "personality": ["adventurous"],
        "hobbies": ["diving", "hiking"],
        "food_likes": [],
        "food_dislikes": [],
        "dietary_limits": [],
        "liked_last_trip": "",
        "disliked_last_trip": "",
    },
}


def run_checks_on_plan(plan, profile: dict) -> dict[str, tuple[bool, str]]:
    import inspect
    data = json.loads(plan.model_dump_json(by_alias=True))
    results = {}
    for name, fn in ALL_CHECKS:
        sig = inspect.signature(fn)
        if len(sig.parameters) >= 2:
            passed, msg = fn(data, profile)
        else:
            passed, msg = fn(data)
        results[name] = (passed, msg)
    return results


def check_arabic_copy(data: dict) -> tuple[bool, str]:
    """A10: itinerary title/description fields should be Arabic."""
    missing = []
    for day in data.get("itinerary", []):
        for act in day.get("activities", []):
            title = act.get("title", "")
            desc = act.get("description", "")
            if not contains_arabic(title) or not contains_arabic(desc):
                missing.append(title or "(empty title)")
    if missing:
        return False, f"Non-Arabic titles/descriptions: {', '.join(missing[:4])}"
    return True, "Itinerary titles and descriptions are in Arabic"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", choices=["en", "ar"], default="en")
    args = parser.parse_args()

    trip = dict(TRIP)
    trip["language"] = args.language

    if args.language == "ar":
        if normalize_arabic("الإسكندرية") != normalize_arabic("الاسكندريه"):
            print("[FAIL] Arabic alef/taa-marbuta normalization mismatch")
            sys.exit(1)
        dest_hit, _ = check_immutable_fields_guard("غير الوجهه إلى الاسكندريه")
        diet_hit, _ = check_dietary_limits_guard(
            "أضف وجبة لحم الخنزير",
            {"dietary_limits": ["halal"], "food_dislikes": []},
        )
        if not dest_hit or not diet_hit:
            print("[FAIL] A11 Arabic safety checks did not fire on normalized variants")
            sys.exit(1)
        print("[PASS] A11 Arabic normalization (destination + dietary)")

    density: dict[str, float] = {}
    all_passed = True

    print("=" * 60)
    print(f"A5 Quality Check Suite (3 runs x 2 profiles) language={args.language}")
    print("=" * 60)

    for profile_key, profile in PROFILES.items():
        print(f"\nProfile: [{profile_key}]")
        avg_densities = []

        for run in range(1, 4):
            raw_plan = build_mock_plan(profile, trip)
            plan = post_process(raw_plan, profile=profile)
            results = run_checks_on_plan(plan, profile)
            if args.language == "ar":
                results["arabic_copy"] = check_arabic_copy(
                    json.loads(plan.model_dump_json(by_alias=True))
                )
            data = json.loads(plan.model_dump_json(by_alias=True))

            num_days = len(data["itinerary"])
            total_acts = sum(len(d["activities"]) for d in data["itinerary"])
            avg = total_acts / num_days if num_days else 0.0
            avg_densities.append(avg)

            run_passed = all(p for p, _ in results.values())
            status_str = "[PASS]" if run_passed else "[FAIL]"
            print(f"  Run {run}: {status_str} | avg_activities/day = {avg:.2f}")

            for name, (passed, msg) in results.items():
                if not passed:
                    print(f"    [FAIL] {name}: {msg}")
                    all_passed = False

        density[profile_key] = sum(avg_densities) / len(avg_densities)

    print("\n" + "=" * 60)
    print("Activity Density Comparison:")
    calm_density = density.get("calm", 999.0)
    adv_density = density.get("adventurous", 0.0)
    print(f"  Calm profile:        {calm_density:.2f} activities/day")
    print(f"  Adventurous profile: {adv_density:.2f} activities/day")

    if calm_density < adv_density:
        print(f"  [PASS] Density condition met: calm ({calm_density:.2f}) < adventurous ({adv_density:.2f})")
    else:
        print(f"  [FAIL] Density check failed: calm ({calm_density:.2f}) >= adventurous ({adv_density:.2f})")
        all_passed = False

    print("=" * 60)
    if all_passed:
        print("[ALL CHECKS PASSED] Suite completed successfully.")
        sys.exit(0)
    else:
        print("[FAILED] Some quality checks did not pass.")
        sys.exit(1)


if __name__ == "__main__":
    main()
