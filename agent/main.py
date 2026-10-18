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
import concurrent.futures
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

try:
    from crewai import Crew, Process
    from agent.agents.context_agent import create_context_agent
    from agent.agents.search_agent import create_search_agent
    from agent.agents.planner_agent import create_planner_agent
    from agent.tasks.context_task import create_context_task
    from agent.tasks.search_task import create_search_task
    from agent.tasks.planner_task import create_planner_task
    from agent.tools.tavily_tool import reset_search_counter
    CREWAI_AVAILABLE = True
except ImportError:
    Crew = None  # type: ignore
    Process = None  # type: ignore
    CREWAI_AVAILABLE = False

from agent.schemas import FinalPlanResponse, UserProfile, TripRequest
from agent.fallbacks.direct_gemini import run_direct_gemini_fallback
from agent.fallbacks.direct_groq import run_direct_groq_fallback
from agent.fallbacks.mock_builder import build_mock_plan
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
    if not CREWAI_AVAILABLE:
        raise RuntimeError("CrewAI is not installed or available.")
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
# Orchestrator & Timeout Management
# ---------------------------------------------------------------------------

GLOBAL_TIMEOUT_S = int(os.getenv("AGENT_GLOBAL_TIMEOUT_S", "40"))


def _run_tier_with_timeout(fn, *args, timeout_s: int | None = None):
    """Run fn(*args) in a worker thread; raise TimeoutError if it exceeds timeout_s."""
    timeout = timeout_s if timeout_s is not None else GLOBAL_TIMEOUT_S
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(fn, *args)
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            raise TimeoutError(f"Tier execution exceeded {timeout}s deadline")


def generate_plan_from_dict(
    profile: dict,
    trip: dict,
    force_tier: int | None = None,
) -> FinalPlanResponse:
    """3-tier plan generation with automatic fallback from raw dictionaries."""
    validated_profile = UserProfile.model_validate(profile)
    validated_trip = TripRequest.model_validate(trip)

    p_dict = validated_profile.model_dump()
    t_dict = validated_trip.model_dump()
    # language is an optional generation hint, not part of the public trip contract
    if trip.get("language"):
        t_dict["language"] = trip["language"]

    tiers = [force_tier] if force_tier else [1, 2, 3]

    for tier in tiers:
        try:
            if tier == 1:
                logger.info("🚀 Tier 1: Starting primary pipeline (CrewAI / Gemini)...")
                tavily_key = os.getenv("TAVILY_API_KEY", "")
                if CREWAI_AVAILABLE and tavily_key and not tavily_key.startswith("tvly_your"):
                    try:
                        plan = _run_tier_with_timeout(
                            run_crewai_pipeline, p_dict, t_dict, timeout_s=GLOBAL_TIMEOUT_S
                        )
                        tier_name = "crewai"
                    except Exception as crew_err:
                        logger.warning(
                            "CrewAI pipeline failed or timed out (%s), trying direct Gemini: %s",
                            type(crew_err).__name__,
                            crew_err,
                        )
                        plan = _run_tier_with_timeout(
                            run_direct_gemini_fallback, p_dict, t_dict, timeout_s=20
                        )
                        tier_name = "gemini"
                else:
                    plan = _run_tier_with_timeout(
                        run_direct_gemini_fallback, p_dict, t_dict, timeout_s=20
                    )
                    tier_name = "gemini"
            elif tier == 2:
                logger.info("⚡ Tier 2: Direct Groq fallback...")
                plan = _run_tier_with_timeout(
                    run_direct_groq_fallback, p_dict, t_dict, timeout_s=30
                )
                tier_name = "groq"
            elif tier == 3:
                logger.info("🏗️  Tier 3: Deterministic mock builder...")
                plan = build_mock_plan(p_dict, t_dict)
                tier_name = "mock"
            else:
                continue

            plan = post_process(plan, profile=p_dict)
            plan.search_context = tier_name
            logger.info("✅ Tier %d succeeded (%s)", tier, tier_name)
            return plan

        except Exception as exc:
            logger.warning("⚠️  Tier %d failed: %s", tier, exc)
            if tier == tiers[-1]:
                logger.error("❌ All tiers exhausted. No plan generated.")
                raise

    raise RuntimeError("No tiers executed")


def generate_plan(
    profile_path: Path = DEFAULT_PROFILE,
    trip_path: Path = DEFAULT_TRIP,
    force_tier: int | None = None,
) -> FinalPlanResponse:
    """3-tier plan generation with automatic fallback from file paths."""
    raw_profile = load_json(profile_path)
    raw_trip = load_json(trip_path)

    plan = generate_plan_from_dict(raw_profile, raw_trip, force_tier=force_tier)
    output_path = OUTPUT_DIR / "plan_output.json"
    save_plan(plan, output_path)
    return plan


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
