"""Tier 2 fallback — Direct Groq SDK.

Called when CrewAI fails or times out. Sends a single prompt to Groq with
json_object mode and validates against FinalPlanResponse.
"""

import os
import json
import logging
from datetime import date

from groq import Groq
from agent.schemas import FinalPlanResponse

logger = logging.getLogger(__name__)


def run_direct_groq_fallback(
    profile: dict,
    trip: dict,
) -> FinalPlanResponse:
    """Generate a plan using the Groq SDK directly (no CrewAI).

    Raises
    ------
    Exception
        If the Groq call fails or the output doesn't validate.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("gsk_your"):
        raise ValueError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)
    budget = trip["total_budget"]
    currency = trip.get("currency", "EGP")

    system_msg = (
        "You are a JSON travel plan generator. Output ONLY valid JSON — "
        "no markdown, no commentary, no code fences."
    )

    user_msg = (
        f"Generate a complete travel plan as valid JSON.\n\n"
        f"SCHEMA (follow exactly):\n"
        f"{json.dumps(FinalPlanResponse.model_json_schema(), indent=2)}\n\n"
        f"CRITICAL RULES:\n"
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
        f"11. created_at and updated_at: {date.today().isoformat()}\n\n"
        f"User Profile: {json.dumps(profile)}\n"
        f"Trip Request: {json.dumps(trip)}"
    )

    model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    # strip groq/ prefix if present
    if model_name.startswith("groq/"):
        model_name = model_name[5:]

    logger.info("Calling Groq directly with model %s (Tier 2 fallback)...", model_name)

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=1000,
    )

    raw_content = response.choices[0].message.content
    logger.debug("Groq raw response length: %d chars", len(raw_content))

    raw = json.loads(raw_content)
    plan = FinalPlanResponse.model_validate(raw)

    logger.info("Tier 2 fallback produced a valid plan")
    return plan
