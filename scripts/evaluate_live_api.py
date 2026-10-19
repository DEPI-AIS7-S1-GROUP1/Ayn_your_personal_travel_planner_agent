"""Run one real end-to-end evaluation using the repository's sample trip.

This deliberately uses configured provider APIs. It writes only the generated
plan to reports/live_api_plan.json; it never prints environment credentials.
"""

from __future__ import annotations

import json
import os
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=False)

from agent.main import generate_plan_from_dict
from agent.tools.tavily_tool import execute_tavily_search
from tests.validate_output import run_validation


def _configured(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


def evaluate_live_search() -> int:
    query = (
        "Sharm El Sheikh halal seafood restaurants attractions current prices opening hours "
        f"(live evaluation {datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')})"
    )
    payload = json.loads(execute_tavily_search(query))
    output_path = ROOT / "reports" / "live_api_search.json"
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    urls = [item.get("url") for item in payload.get("results", []) if item.get("url")]
    print(f"Tavily status: {payload.get('status')}; cached={payload.get('cached', False)}")
    print(f"Tavily results: {len(payload.get('results', []))}; source URLs: {len(urls)}")
    if payload.get("status") == "error":
        print(f"Tavily failure class: {payload.get('error_type')}")
        return 2
    print(f"Saved live search response: {output_path}")
    return 0 if payload.get("status") == "ok" else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--search-only", action="store_true", help="Call Tavily once without regenerating the itinerary")
    parser.add_argument("--language", choices=("en", "ar"), help="Set trip language hint for generation")
    parser.add_argument("--tier", type=int, choices=(1, 2, 3), help="Force a tier, e.g. 2 for Groq-only evaluation")
    args = parser.parse_args()
    if args.search_only:
        print(f"TAVILY_API_KEY configured: {_configured('TAVILY_API_KEY')}")
        return evaluate_live_search()

    profile = json.loads((ROOT / "mock-data" / "profile.json").read_text(encoding="utf-8"))
    trip = json.loads((ROOT / "mock-data" / "trip-request.json").read_text(encoding="utf-8"))
    if args.language:
        trip["language"] = args.language
    available = {key: _configured(key) for key in ("GEMINI_API_KEY", "TAVILY_API_KEY", "GROQ_API_KEY")}
    print("Configured provider credentials:", ", ".join(f"{key}={value}" for key, value in available.items()))

    plan = generate_plan_from_dict(profile, trip, force_tier=args.tier)
    plan_name = "live_api_plan_ar.json" if trip.get("language") == "ar" else "live_api_plan.json"
    output_path = ROOT / "reports" / plan_name
    output_path.write_text(plan.model_dump_json(indent=2, by_alias=True), encoding="utf-8")
    print(f"Generation route: {plan.search_context}")
    print(f"Destination: {plan.destination.city}, {plan.destination.country}")
    print(f"Travel dates: {plan.start_date} to {plan.end_date}")
    print(f"Budget: {plan.total_budget} {plan.currency}; split sum: "
          f"{plan.budget_split.hotel + plan.budget_split.food + plan.budget_split.activities + plan.budget_split.transport}")
    print(f"Days: {len(plan.itinerary)}; activities: {sum(len(day.activities) for day in plan.itinerary)}")
    if trip.get("language") == "ar":
        arabic_fields = sum(
            any("\u0600" <= character <= "\u06ff" for character in text)
            for day in plan.itinerary for activity in day.activities
            for text in (activity.title, activity.description)
        )
        total_fields = sum(len(day.activities) * 2 for day in plan.itinerary)
        print(f"Arabic activity title/description fields: {arabic_fields}/{total_fields}")
    print(f"Saved generated plan: {output_path}")
    validation_ok = run_validation(output_path, profile)
    return 0 if validation_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
