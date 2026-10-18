"""Run timed performance benchmarks across agent tiers and profiles.

Usage:
    python scripts/measure_agent.py --skip-crewai
    python scripts/measure_agent.py --tier mock
    python scripts/measure_agent.py --tier gemini
    python scripts/measure_agent.py
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Safe encoding configuration for Windows PowerShell
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Setup root path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.monitoring import MonitorContext, clear_records, flush_to_markdown
from agent.fallbacks.direct_gemini import run_direct_gemini_fallback
from agent.fallbacks.direct_groq import run_direct_groq_fallback
from agent.fallbacks.mock_builder import build_mock_plan
from agent.validators.post_processor import post_process

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

MOCK_DATA = ROOT_DIR / "mock-data"
TRIP_FILE = MOCK_DATA / "trip-request.json"

PROFILES = {
    "calm": {
        "personality": ["calm"],
        "hobbies": ["museums", "photography"],
        "food_likes": ["seafood", "koshari"],
        "food_dislikes": ["very spicy food"],
        "dietary_limits": ["halal"],
        "liked_last_trip": "Quiet walks, museums.",
        "disliked_last_trip": "Crowds and noise.",
    },
    "adventurous": {
        "personality": ["adventurous"],
        "hobbies": ["hiking", "diving", "nightlife"],
        "food_likes": ["street food", "spicy"],
        "food_dislikes": [],
        "dietary_limits": [],
        "liked_last_trip": "Extreme sports and late nights.",
        "disliked_last_trip": "Slow itineraries.",
    },
}

TIER_FUNCS = {
    "mock": build_mock_plan,
    "gemini": run_direct_gemini_fallback,
    "groq": run_direct_groq_fallback,
}


def load_trip() -> dict:
    if TRIP_FILE.exists():
        with open(TRIP_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
        "departure_city": "Cairo",
        "start_date": "2026-11-10",
        "end_date": "2026-11-12",
        "total_budget": 60000,
        "currency": "EGP",
        "travelers": 2,
    }


def run_single_tier(
    tier_name: str,
    fn,
    profile: dict,
    profile_key: str,
    run_num: int,
    trip: dict,
) -> None:
    run_id = f"{tier_name}_{profile_key}_r{run_num}"
    try:
        with MonitorContext(tier_name, profile, run_id=run_id) as ctx:
            plan = fn(profile, trip)
            plan = post_process(plan, profile=profile)
            # Basic validation of required properties
            if plan.destination.city and len(plan.itinerary) > 0:
                ctx.json_valid = True
            else:
                ctx.json_valid = False
                ctx.error = "Empty itinerary or missing destination"
        print(f"  [OK]   {run_id:<24} | {ctx.duration_s:6.2f}s | valid={ctx.json_valid}")
    except Exception as exc:
        err_msg = str(exc).replace("\n", " ")[:120]
        print(f"  [FAIL] {run_id:<24} | Error: {err_msg}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Measure performance across agent tiers.")
    parser.add_argument(
        "--tier",
        choices=["crewai", "gemini", "groq", "mock"],
        default=None,
        help="Run only the specified tier",
    )
    parser.add_argument(
        "--skip-crewai",
        action="store_true",
        default=False,
        help="Skip Tier 1 CrewAI pipeline (saves time & token quota)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="Number of runs per combo (default: 3)",
    )
    args = parser.parse_args()

    trip = load_trip()
    clear_records()

    tiers: dict[str, Any] = {}

    # CrewAI tier option
    if not args.skip_crewai and args.tier in (None, "crewai"):
        try:
            from agent.main import run_crewai_pipeline
            tiers["crewai"] = run_crewai_pipeline
        except Exception as exc:
            print(f"[WARN] CrewAI not available ({exc}), skipping crewai tier")

    # Other tiers
    for name, func in TIER_FUNCS.items():
        if args.tier is None or args.tier == name:
            tiers[name] = func

    print("=" * 65)
    print(f"Starting Agent Performance Benchmark ({args.runs} runs per combo)")
    print(f"Tiers: {list(tiers.keys())}")
    print(f"Profiles: {list(PROFILES.keys())}")
    print("=" * 65)

    for tier_name, fn in tiers.items():
        print(f"\n>> Benchmarking Tier: [{tier_name}]")
        for profile_key, profile in PROFILES.items():
            print(f"   Profile: {profile_key}")
            for r in range(1, args.runs + 1):
                run_single_tier(tier_name, fn, profile, profile_key, r, trip)

    report_path = flush_to_markdown()
    print("\n" + "=" * 65)
    print(f"[DONE] Benchmark completed! Results flushed to:")
    print(f"       {report_path}")
    print("=" * 65)


if __name__ == "__main__":
    main()
