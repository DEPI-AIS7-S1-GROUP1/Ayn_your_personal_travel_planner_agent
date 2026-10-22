"""Tier 2 fallback — Direct Groq SDK.

Called when CrewAI fails or times out. Sends a single prompt to Groq with
json_object mode and validates against FinalPlanResponse.
"""

import os
import json
import logging
from datetime import date

from groq import Groq
from agent.arabic import arabic_language_rule_block
from agent.fallbacks.prompt_rules import compact_schema, days_rule
from agent.schemas import FinalPlanResponse
from agent.feedback import feedback_text
from agent.tools.restaurant_search import restaurant_rule_block

logger = logging.getLogger(__name__)


def run_direct_groq_fallback(
    profile: dict,
    trip: dict,
    restaurants: list[dict] | None = None,
) -> FinalPlanResponse:
    """Generate a plan using the Groq SDK directly (no CrewAI).

    restaurants: search evidence from agent/tools/restaurant_search.py, so meals name real places.

    Raises
    ------
    Exception
        If the Groq call fails or the output doesn't validate.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("gsk_your"):
        raise ValueError("GROQ_API_KEY is not configured")

    # No SDK retries: on a 429 the SDK sleeps ~30s, which outlives the Tier 2 deadline, so the
    # worker is killed and the real reason (rate limit) never reaches the log.
    client = Groq(api_key=api_key, timeout=float(os.getenv("GROQ_REQUEST_TIMEOUT_S", "25")), max_retries=0)
    budget = trip["total_budget"]
    currency = trip.get("currency", "EGP")

    system_msg = (
        "You are a JSON travel plan generator. Output ONLY valid JSON — "
        "no markdown, no commentary, no code fences."
    )

    user_msg = (
        f"Generate a complete travel plan as valid JSON.\n\n"
        f"SCHEMA (follow exactly):\n"
        f"{compact_schema()}\n\n"
        f"CRITICAL RULES:\n"
        f"0. {days_rule(trip)}\n"
        f"1. Efficient Plan Generation: Construct and output the itinerary directly and "
        f"concisely according to the specified Pydantic schema. Avoid long descriptions, "
        f"conversational filler, or unnecessary prose to keep token consumption minimal "
        f"while satisfying all structural contract requirements. Keep activity descriptions to 1 concise sentence.\n"
        f"2. budget_split sum (hotel + food + activities + transport) "
        f"MUST = {budget}\n"
        f"3. Respect food dislikes: {profile.get('food_dislikes', [])}\n"
        f"4. Respect dietary limits: {profile.get('dietary_limits', [])}\n"
        f"5. All costs: integers only (no decimals)\n"
        f"6. Hotel check-in/check-out activities: estimated_cost = 0\n"
        f"7. time_slot: morning, afternoon, or evening\n"
        f"8. category: hotel, food, activities, or transport\n"
        f"9. Include 2 flight options and 2-3 hotel options\n"
        f"10. All prices are total for the whole group\n"
        f"11. created_at and updated_at: {date.today().isoformat()}\n"
        f"12. {feedback_text(profile)}\n\n"
        f"{arabic_language_rule_block(trip)}\n"
        f"{restaurant_rule_block(restaurants or [], trip)}\n"
        f"User Profile: {json.dumps(profile)}\n"
        f"Trip Request: {json.dumps(trip)}"
    )

    model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    # strip groq/ prefix if present
    if model_name.startswith("groq/"):
        model_name = model_name[5:]

    logger.info("Calling Groq directly with model %s (Tier 2 fallback)...", model_name)

    # Room for every day: a 4-day Arabic plan is ~1,200-1,700 output tokens. A fixed 950 cap cut
    # plans short (3 days of 4) and they failed validation. Prompt + output must stay under the
    # free tier's 8,000 tokens per minute, and the restaurant sources make the prompt longer
    # (~3 characters per token is a safe estimate for this mostly-English prompt).
    num_days = (date.fromisoformat(trip["end_date"]) - date.fromisoformat(trip["start_date"])).days + 1
    prompt_tokens = (len(system_msg) + len(user_msg)) // 3
    max_tokens = int(os.getenv("GROQ_MAX_OUTPUT_TOKENS", "0")) or min(
        6000, 800 + 450 * num_days, 7800 - prompt_tokens
    )
    extra = {"reasoning_effort": "low"} if model_name.startswith("openai/gpt-oss") else {}

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=max(256, max_tokens),
        **extra,
    )

    if response.choices[0].finish_reason == "length":
        raise ValueError(f"Groq output hit max_tokens={max_tokens} before the plan was complete")
    raw_content = response.choices[0].message.content
    logger.debug("Groq raw response length: %d chars", len(raw_content))

    raw = json.loads(raw_content)
    plan = FinalPlanResponse.model_validate(raw)

    logger.info("Tier 2 fallback produced a valid plan")
    return plan
