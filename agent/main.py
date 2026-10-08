"""Main orchestrator — 3-tier plan generation pipeline.

Usage:
    python -m agent.main
    python -m agent.main --profile path/to/profile.json --trip path/to/trip.json
    python -m agent.main --tier 3   (force a specific tier for testing)
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import date

from dotenv import load_dotenv

# Load .env before any other imports that need API keys
# Force UTF-8 output encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from crewai import Crew, Process

from agent.schemas import FinalPlanResponse, UserProfile, TripRequest
from agent.agents.context_agent import create_context_agent
from agent.agents.search_agent import create_search_agent
from agent.agents.planner_agent import create_planner_agent
from agent.tasks.context_task import create_context_task
from agent.tasks.search_task import create_search_task
from agent.tasks.planner_task import create_planner_task
from agent.fallbacks.direct_groq import run_direct_groq_fallback
from agent.fallbacks.mock_builder import build_mock_plan
from agent.tools.tavily_tool import reset_search_counter
from agent.validators.post_processor import post_process

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("agent.main")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROFILE = PROJECT_ROOT / "mock-data" / "profile.json"
DEFAULT_TRIP = PROJECT_ROOT / "mock-data" / "trip-request.json"
OUTPUT_DIR = PROJECT_ROOT / "output"


def load_json(path: Path) -> dict:
    """Load and return a JSON file as a dict."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_plan(plan: FinalPlanResponse, path: Path) -> None:
    """Write the plan to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(plan.model_dump_json(indent=2, by_alias=True))
    logger.info("Plan saved to %s", path)


# ---------------------------------------------------------------------------
# Tier 1 — CrewAI Pipeline
# ---------------------------------------------------------------------------

def run_crewai_pipeline(profile: dict, trip: dict) -> FinalPlanResponse:
    """Execute the 3-agent sequential CrewAI pipeline."""
    reset_search_counter()
    logger.info("Creating agents...")
    context_agent = create_context_agent()
    search_agent = create_search_agent()
    planner_agent = create_planner_agent()

    logger.info("Creating tasks...")
    context_task = create_context_task(context_agent, profile, trip)
    search_task = create_search_task(search_agent, context_task, trip)
    planner_task = create_planner_task(planner_agent, search_task, profile, trip)

    logger.info("Kicking off CrewAI pipeline...")
    crew = Crew(
        agents=[context_agent, search_agent, planner_agent],
        tasks=[context_task, search_task, planner_task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()

    # Extract the JSON from CrewAI's result
    if hasattr(result, "json_dict") and result.json_dict:
        return FinalPlanResponse.model_validate(result.json_dict)

    raw_text = result.raw if hasattr(result, "raw") and result.raw else str(result)
    cleaned = raw_text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()

    # Find the outermost JSON object if any preamble text exists
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1:
        cleaned = cleaned[start_idx : end_idx + 1]

    try:
        raw = json.loads(cleaned)
    except Exception:
        import json_repair
        raw = json_repair.loads(cleaned)

    return FinalPlanResponse.model_validate(raw)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def generate_plan(
    profile_path: Path = DEFAULT_PROFILE,
    trip_path: Path = DEFAULT_TRIP,
    force_tier: int | None = None,
) -> FinalPlanResponse:
    """3-tier plan generation with automatic fallback.

    Parameters
    ----------
    profile_path : Path
        Path to the user profile JSON.
    trip_path : Path
        Path to the trip request JSON.
    force_tier : int or None
        If set, skip directly to this tier (1, 2, or 3). Useful for testing.
    """
    raw_profile = load_json(profile_path)
    raw_trip = load_json(trip_path)

    # Strictly validate against schemas (contract §2, §3.2, §3.3)
    # Reject unknown values in closed enums (hobbies, dietary_limits, etc.)
    validated_profile = UserProfile.model_validate(raw_profile)
    validated_trip = TripRequest.model_validate(raw_trip)

    profile = validated_profile.model_dump()
    trip = validated_trip.model_dump()
    output_path = OUTPUT_DIR / "plan_output.json"

    logger.info("=" * 60)
    logger.info("Personal Travel Planner — Agent Pipeline")
    logger.info("=" * 60)
    logger.info(
        "Destination: %s, %s | Budget: %s %s | Days: %s to %s",
        trip["destination"]["city"],
        trip["destination"]["country"],
        trip["total_budget"],
        trip.get("currency", "EGP"),
        trip["start_date"],
        trip["end_date"],
    )

    tiers = []
    if force_tier:
        tiers = [force_tier]
    else:
        tiers = [1, 2, 3]

    for tier in tiers:
        try:
            if tier == 1:
                logger.info("🚀 Tier 1: Starting CrewAI pipeline...")
                plan = run_crewai_pipeline(profile, trip)
            elif tier == 2:
                logger.info("⚡ Tier 2: Direct Groq fallback...")
                plan = run_direct_groq_fallback(profile, trip)
            elif tier == 3:
                logger.info("🏗️  Tier 3: Deterministic mock builder...")
                plan = build_mock_plan(profile, trip)
            else:
                continue

            # Post-process every output
            plan = post_process(plan)
            save_plan(plan, output_path)
            logger.info("✅ Tier %d succeeded", tier)
            return plan

        except Exception as exc:
            logger.warning("⚠️  Tier %d failed: %s", tier, exc, exc_info=True)
            if tier == tiers[-1]:
                # Last tier failed — this shouldn't happen with Tier 3
                logger.error("❌ All tiers exhausted. No plan generated.")
                raise

    # Should never reach here
    raise RuntimeError("No tiers executed")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Personal Travel Planner — Agent Pipeline"
    )
    parser.add_argument(
        "--profile",
        type=Path,
        default=DEFAULT_PROFILE,
        help=f"Path to profile JSON (default: {DEFAULT_PROFILE})",
    )
    parser.add_argument(
        "--trip",
        type=Path,
        default=DEFAULT_TRIP,
        help=f"Path to trip request JSON (default: {DEFAULT_TRIP})",
    )
    parser.add_argument(
        "--tier",
        type=int,
        choices=[1, 2, 3],
        default=None,
        help="Force a specific tier (1=CrewAI, 2=Groq, 3=Mock)",
    )

    args = parser.parse_args()

    try:
        plan = generate_plan(args.profile, args.trip, force_tier=args.tier)
        print("\n" + "=" * 60)
        print("✅ Plan generated successfully!")
        print(f"   Output: {OUTPUT_DIR / 'plan_output.json'}")
        print(f"   Destination: {plan.destination.city}, {plan.destination.country}")
        print(f"   Days: {len(plan.itinerary)}")
        print(f"   Budget: {plan.total_budget} {plan.currency}")
        bs = plan.budget_split
        print(f"   Split: hotel={bs.hotel} food={bs.food} "
              f"activities={bs.activities} transport={bs.transport}")
        print(f"   Sum check: {bs.hotel + bs.food + bs.activities + bs.transport} "
              f"== {plan.total_budget}")
        print("=" * 60)
    except Exception as exc:
        print(f"\n❌ Failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
