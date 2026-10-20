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
import multiprocessing
import queue
import time
from pathlib import Path
from datetime import date

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

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
from agent.tools.restaurant_search import named_meal_count, restaurant_names, search_restaurants
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

def run_crewai_pipeline(profile: dict, trip: dict, restaurants: list[dict] | None = None) -> FinalPlanResponse:
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
    planner_task = create_planner_task(planner_agent, search_task, profile, trip, restaurants)

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
TOTAL_TIMEOUT_S = int(os.getenv("AGENT_TOTAL_TIMEOUT_S", "75"))
GEMINI_RETRY_DELAY_S = float(os.getenv("AGENT_GEMINI_RETRY_DELAY_S", "2"))
GEMINI_RETRY_MIN_REMAINING_S = 45  # a retry must still leave time for Tier 2


def _tier_worker(result_queue, fn, args):
    """Process entry point returning JSON-safe plan data or a safe error."""
    try:
        result = fn(*args)
        result_queue.put((True, result.model_dump(mode="json", by_alias=True)))
    except BaseException as exc:
        result_queue.put((False, type(exc).__name__, str(exc)[:1000]))


def _run_tier_with_timeout(fn, *args, timeout_s: int | None = None):
    """Run a tier in a killable process with a hard wall deadline.

    Terminating a local worker cannot recall a request already accepted by a
    remote provider, so network timeouts remain configured at provider level.
    """
    timeout = timeout_s if timeout_s is not None else GLOBAL_TIMEOUT_S
    ctx = multiprocessing.get_context("spawn")
    result_queue = ctx.Queue(maxsize=1)
    process = ctx.Process(target=_tier_worker, args=(result_queue, fn, args), daemon=True)
    process.start()
    process.join(timeout)
    if process.is_alive():
        process.terminate()
        process.join(2)
        if process.is_alive() and hasattr(process, "kill"):
            process.kill()
            process.join(2)
        result_queue.close()
        raise TimeoutError(f"Tier execution exceeded {timeout}s deadline; worker process terminated")
    try:
        succeeded, *payload = result_queue.get(timeout=1)
    except queue.Empty as exc:
        result_queue.close()
        raise RuntimeError(f"Tier worker exited with code {process.exitcode} without a result") from exc
    finally:
        result_queue.close()
    if not succeeded:
        error_type, message = payload
        raise RuntimeError(f"{error_type}: {message}")
    return FinalPlanResponse.model_validate(payload[0])


def _key_configured(name: str) -> bool:
    """True when an API key looks real (not empty, not an .env.example placeholder)."""
    value = os.getenv(name, "").strip()
    return bool(value) and "your" not in value.lower()


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
    deadline = time.monotonic() + TOTAL_TIMEOUT_S
    gemini_retried = False

    # One restaurant search for every tier, so meals name real places whichever tier answers.
    # Cached per city for 72 h; [] when Tavily is off or fails, and the plan is built as before.
    restaurants = search_restaurants(t_dict, p_dict)
    names = restaurant_names(restaurants, t_dict["destination"]["city"])

    i = 0
    while i < len(tiers):
        tier = tiers[i]
        i += 1
        try:
            remaining_s = deadline - time.monotonic()
            if tier != 3 and remaining_s <= 0:
                raise TimeoutError(f"Overall generation deadline of {TOTAL_TIMEOUT_S}s exceeded")
            # A tier without its key is skipped before a worker process starts: starting one
            # (and importing CrewAI) takes ~15 s just to learn the key is missing.
            if tier == 1 and not force_tier and not _key_configured("GEMINI_API_KEY"):
                raise ValueError("GEMINI_API_KEY is not configured")
            if tier == 2 and not force_tier and not _key_configured("GROQ_API_KEY"):
                raise ValueError("GROQ_API_KEY is not configured")
            if tier == 1:
                logger.info("🚀 Tier 1: Starting primary pipeline (CrewAI / Gemini)...")
                tavily_key = os.getenv("TAVILY_API_KEY", "")
                if CREWAI_AVAILABLE:
                    try:
                        plan = _run_tier_with_timeout(
                            run_crewai_pipeline, p_dict, t_dict, restaurants,
                            timeout_s=max(1, min(GLOBAL_TIMEOUT_S, int(remaining_s))),
                        )
                        tier_name = "crewai_gemini"
                    except Exception as crew_err:
                        logger.warning(
                            "CrewAI/Gemini pipeline failed; proceeding to configured fallback (%s): %s",
                            type(crew_err).__name__,
                            crew_err,
                        )
                        raise crew_err
                else:
                    plan = _run_tier_with_timeout(
                        run_direct_gemini_fallback, p_dict, t_dict, restaurants,
                        timeout_s=max(1, min(int(os.getenv("AGENT_GEMINI_TIMEOUT_S", "20")), int(remaining_s))),
                    )
                    tier_name = "direct_gemini_unverified"
            elif tier == 2:
                logger.info("⚡ Tier 2: Direct Groq fallback...")
                plan = _run_tier_with_timeout(
                    run_direct_groq_fallback, p_dict, t_dict, restaurants,
                    timeout_s=max(1, min(int(os.getenv("AGENT_GROQ_TIMEOUT_S", "30")), int(remaining_s))),
                )
                tier_name = "groq_unverified"
            elif tier == 3:
                logger.info("🏗️  Tier 3: Deterministic mock builder...")
                plan = build_mock_plan(p_dict, t_dict, names)
                tier_name = "mock_unverified"
            else:
                continue

            plan = post_process(plan, profile=p_dict, language=t_dict.get("language", "en"))
            # The Options page needs flights and hotels; an LLM can return empty lists and still
            # pass the schema (seen with Groq in Arabic). Fill only what is missing from the
            # deterministic builder and say so in the tier name.
            if tier != 3 and (not plan.options.flights or not plan.options.hotels):
                fallback_options = build_mock_plan(p_dict, t_dict).options
                if not plan.options.flights:
                    plan.options.flights = fallback_options.flights
                if not plan.options.hotels:
                    plan.options.hotels = fallback_options.hotels
                tier_name += "+mock_options"
                logger.warning("Tier %d returned no flights or hotels; filled them from the mock builder", tier)
            plan.search_context = tier_name
            model_name = (os.getenv("GEMINI_MODEL", "gemini-3.8-flash") if "gemini" in tier_name
                          else os.getenv("GROQ_MODEL", "openai/gpt-oss-120b") if tier_name.startswith("groq")
                          else "deterministic")
            logger.info("Tier %d succeeded: provider=%s model=%s", tier, tier_name, model_name)
            if names:
                named, meals = named_meal_count(plan.itinerary, names)
                logger.info("Meals naming a searched restaurant: %d of %d", named, meals)
            logger.info("✅ Tier %d succeeded (%s)", tier, tier_name)
            return plan

        except Exception as exc:
            logger.warning("⚠️  Tier %d failed: %s", tier, exc)
            # Gemini's 503 ("high demand") is usually over within seconds: one short retry of
            # Tier 1 before falling back, when enough of the overall deadline is left.
            if (tier == 1 and not force_tier and not gemini_retried
                    and any(code in str(exc) for code in ("503", "UNAVAILABLE"))
                    and deadline - time.monotonic() > GEMINI_RETRY_MIN_REMAINING_S):
                gemini_retried = True
                logger.info("Tier 1 got 503; retrying once in %ss", GEMINI_RETRY_DELAY_S)
                time.sleep(GEMINI_RETRY_DELAY_S)
                i -= 1
                continue
            if i < len(tiers):
                logger.info("Fallback transition: tier %d -> tier %d", tier, tiers[i])
            message = str(exc)
            reason = ("schema_validation" if "ValidationError" in message else
                      "malformed_json" if "JSONDecodeError" in message else
                      "timeout" if isinstance(exc, TimeoutError) else
                      "model_not_found_or_unavailable" if any(code in message for code in ("404", "NOT_FOUND")) else
                      "provider_unavailable" if any(code in message for code in ("503", "UNAVAILABLE")) else
                      "provider_error" if any(name in message for name in (
                          "APIConnectionError", "ClientError", "ServerError", "RateLimitError",
                      )) else "pipeline_error")
            failed_provider = "Gemini" if tier == 1 else "Groq" if tier == 2 else "deterministic"
            failed_model = (os.getenv("GEMINI_MODEL", "gemini-3.8-flash") if tier == 1 else
                            os.getenv("GROQ_MODEL", "openai/gpt-oss-120b") if tier == 2 else "n/a")
            logger.warning("Tier %d failed: provider=%s model=%s class=%s reason=%s",
                           tier, failed_provider, failed_model, type(exc).__name__, reason)
            if i >= len(tiers):
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
