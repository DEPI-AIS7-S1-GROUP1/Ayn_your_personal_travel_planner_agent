"""Direct Gemini fallback for plan generation.

Sends a single structured prompt to Gemini with response_mime_type="application/json"
and validates against FinalPlanResponse.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date
from typing import Any
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env', override=False)

from agent.arabic import arabic_language_rule_block
from agent.fallbacks.prompt_rules import compact_schema, days_rule
from agent.schemas import FinalPlanResponse
from agent.feedback import feedback_text
from agent.tools.restaurant_search import restaurant_rule_block

logger = logging.getLogger(__name__)


def run_direct_gemini_fallback(
    profile: dict[str, Any],
    trip: dict[str, Any],
    restaurants: list[dict] | None = None,
) -> FinalPlanResponse:
    """Generate a plan using the Google GenAI SDK directly.

    restaurants: search evidence from agent/tools/restaurant_search.py, so meals name real places.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip() or api_key.startswith("AIzaSy_your"):
        raise ValueError("GEMINI_API_KEY is not configured")

    from google import genai
    from google.genai import types

    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").removeprefix("gemini/")

    http_options = types.HttpOptions(
        timeout=int(float(os.getenv("GEMINI_REQUEST_TIMEOUT_S", "20")) * 1000),
    )
    client = genai.Client(api_key=api_key.strip(), http_options=http_options)

    budget = trip["total_budget"]

    system_msg = (
        "You are an expert JSON travel plan generator for Egypt. Output ONLY valid JSON — "
        "no markdown, no commentary, no code fences."
    )

    user_msg = (
        f"Generate a complete travel plan as valid JSON.\n\n"
        f"SCHEMA (follow exactly):\n"
        f"{compact_schema()}\n\n"
        f"CRITICAL RULES:\n"
        f"0. {days_rule(trip)}\n"
        f"1. Efficient Plan Generation: Construct and output the itinerary directly and "
        f"concisely according to the specified Pydantic schema. Keep activity descriptions to 1-2 concise sentences.\n"
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

    logger.info("Calling Gemini directly with model %s for plan generation...", model_name)
    response = client.models.generate_content(
        model=model_name,
        contents=user_msg,
        config=types.GenerateContentConfig(
            system_instruction=system_msg,
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=4096,
        ),
    )

    raw_content = response.text or ""
    logger.debug("Gemini raw response length: %d chars", len(raw_content))

    raw = json.loads(raw_content)
    plan = FinalPlanResponse.model_validate(raw)
    logger.info("Direct Gemini plan generation produced a valid plan")
    return plan
