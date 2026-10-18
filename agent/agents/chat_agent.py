"""Agent 4 — Chat Refinement Agent (DESIGN.md §5.3, contract §4.75).

Refines a draft plan via natural language. Reads the current plan, trip,
user profile, conversation history, and user message.

Supports:
- Gemini as primary LLM (using google-genai and GEMINI_API_KEY)
- Groq as backup LLM (using groq SDK and GROQ_API_KEY)
- Deterministic mock refinement fallback when no keys are configured or APIs fail

GUARDS IN CODE (not in prompt):
- Currency, destination, or traveler count change attempt -> needs_clarification.
- Budget change without explicit amount and currency -> needs_clarification.
  (Specifically targets overall trip budget changes, avoiding false triggers on 'low-cost activity').
- Never violate dietary limits or food dislikes from user profile.
  (Uses strict whole-word boundaries with exclusions to prevent 'nut' matching 'minutes' or 'egg' matching 'eggplant').
- Budget split sum must exactly equal total_budget.
"""

from __future__ import annotations

import copy
import json
import logging
import os
import re
from datetime import datetime
from typing import Any

from agent.arabic import normalize_arabic, regex_search

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = (
    "USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD",
    "AUD", "INR", "TRY", "EGP", "SAR", "AED", "MAD"
)

# Dietary limits keyword patterns with word boundaries and negative lookaheads
DIETARY_FORBIDDEN_PATTERNS = {
    "halal": [
        r"\bpork\b", r"\bbacon\b", r"\bham\b", r"\blard\b",
        r"\bwine\b", r"(?<!non-)\balcohol(?:ic)?\b", r"\bbeer\b", r"\bcocktail\b", r"\bliquor\b",
        # Arabic equivalents
        r"(?:لحم\s+)?(?:ال)?خنزير", r"(?:ال)?بيكون", r"(?:ال)?خمر", r"(?:ال)?نبيذ",
        r"(?:ال)?كحول", r"(?:ال)?بيرة",
    ],
    "vegetarian": [
        r"\bmeat\b", r"\bbeef\b", r"\bchicken\b", r"\bpork\b", r"\blamb\b",
        r"\bduck\b", r"\bseafood\b", r"\bfish\b", r"\bshrimp\b", r"\bsalmon\b", r"\btuna\b",
        # Arabic equivalents
        r"(?:ال)?لحم(?:ة|ات|وم)?", r"(?:ال)?دجاج", r"(?:ال)?فراخ", r"(?:ال)?سمك",
        r"(?:ال)?أسماك", r"(?:ال)?جمبري", r"(?:ال)?روبيان", r"(?:ال)?تونا", r"(?:ال)?سلمون",
    ],
    "vegan": [
        r"\bmeat\b", r"\bbeef\b", r"\bchicken\b", r"\bpork\b", r"\blamb\b", r"\bfish\b",
        r"\bdairy\b", r"\bcheese\b", r"\bmilk\b", r"\bbutter\b",
        # eggs but never eggplant / egg-plant
        r"\beggs?\b(?![\s-]?plant)",
        r"\bhoney\b",
        # Arabic equivalents
        r"(?:ال)?لحم(?:ة|ات|وم)?", r"(?:ال)?دجاج", r"(?:ال)?فراخ", r"(?:ال)?سمك",
        r"(?:ال)?ألبان", r"(?:ال)?حليب", r"(?:ال)?لبن", r"(?:ال)?جبن(?:ة)?",
        r"(?:ال)?زبدة", r"(?:ال)?بيض", r"(?:ال)?عسل",
    ],
    "gluten-free": [
        r"\bwheat\b", r"\bgluten\b", r"\bbarley\b", r"\brye\b", r"\bbread\b", r"\bpasta\b",
        # Arabic equivalents
        r"(?:ال)?قمح", r"(?:ال)?غلوتين", r"(?:ال)?جلوتين", r"(?:ال)?شعير",
        r"(?:ال)?خبز", r"(?:ال)?مكرونة", r"(?:ال)?معكرونة",
    ],
    "dairy-free": [
        r"\bmilk\b", r"\bcheese\b", r"\bbutter\b", r"\bcream\b", r"\byogurt\b", r"\bdairy\b",
        # Arabic equivalents
        r"(?:ال)?حليب", r"(?:ال)?لبن", r"(?:ال)?جبن(?:ة)?", r"(?:ال)?زبدة",
        r"(?:ال)?قشطة", r"(?:ال)?كريمة", r"(?:ال)?زبادي", r"(?:ال)?ألبان",
    ],
    "nut-free": [
        # Match standalone nut/nuts, peanut, almond, etc. Never match 'minutes'
        r"\bpeanuts?\b", r"\balmonds?\b", r"\bwalnuts?\b", r"\bhazelnuts?\b",
        r"\bcashews?\b", r"\bpistachios?\b", r"\btree[\s-]nuts?\b",
        r"\bnuts?\b",
        # Arabic equivalents
        r"(?:ال)?مكسرات", r"(?:ال)?فول\s+سوداني", r"(?:ال)?سوداني", r"(?:ال)?لوز",
        r"(?:ال)?جوز", r"عين\s+جمل", r"(?:ال)?بندق", r"(?:ال)?كاجو", r"(?:ال)?فستق",
    ],
}


# ---------------------------------------------------------------------------
# Code Guards
# ---------------------------------------------------------------------------

def check_immutable_fields_guard(message: str) -> tuple[bool, str]:
    """Guard: Currency, destination or travelers cannot change in existing plans."""
    msg_lower = message.lower()

    # Destination change attempts (English & Arabic)
    dest_patterns = [
        r"\b(?:change|switch|move|update)\s+(?:the\s+)?(?:destination|city|country|location|place)\b",
        r"\b(?:go|travel|fly|head)\s+to\s+([a-zA-Z\s]+)\s+instead\b",
        r"\bvisit\s+([a-zA-Z\s]+)\s+instead\b",
        r"\bchange\s+to\s+(?:cairo|alexandria|luxor|aswan|hurghada|dahab|giza)\b",
        # Arabic destination change
        r"(?:غير|بدل|تغيير|تبديل)\s+(?:ال)?وجهة",
        r"(?:غير|بدل|تغيير|تبديل)\s+(?:ال)?مدينة",
        r"(?:غير|بدل|تغيير|تبديل)\s+(?:ال)?مكان",
        r"(?:روح|سافر|اذهب|انتقل|غير|بدل)\s+(?:إلى|الي|لـ)\s+(?:الإسكندرية|القاهرة|الأقصر|اسوان|أسوان|شرم\s+الشيخ|الغردقة|دهب)",
    ]
    for pat in dest_patterns:
        if regex_search(pat, msg_lower):
            return True, (
                "Destination cannot be changed for an existing plan because the contract "
                "specifies destination is fixed at creation. You can create a new trip to explore another city, "
                "or let me know what activities or budget you'd like to adjust for this trip."
            )

    # Travelers change attempts (English & Arabic)
    traveler_patterns = [
        r"\b(?:change|update|switch)\s+(?:the\s+)?(?:number\s+of\s+)?(?:travelers|travellers|people|guests|persons)\b",
        r"\b(?:add|remove|bring)\s+(?:another|one|2|3|4|\d+)\s+(?:traveler|traveller|person|people|friend)\b",
        r"\bwe\s+are\s+now\s+\d+\s+(?:people|travelers|travellers)\b",
        r"\bfor\s+\d+\s+(?:travelers|travellers|people)\b",
        # Arabic travelers change
        r"(?:غير|بدل|تعديل|تغيير)\s+(?:عدد\s+)?(?:ال)?مسافرين",
        r"(?:غير|بدل|تعديل|تغيير)\s+(?:عدد\s+)?(?:الأشخاص|الناس|الأفراد|الضيوف)",
        r"(?:أضف|زد|نقص|قلل|احذف|شيل)\s+(?:مسافر|شخص|واحد)",
        r"(?:إحنا|نحن|بقينا|صرنا)\s+\d+\s+(?:مسافرين|أشخاص|أفراد|ناس)",
        r"لـ?\s*\d+\s+(?:مسافرين|أشخاص|أفراد)",
    ]
    for pat in traveler_patterns:
        if regex_search(pat, msg_lower):
            return True, (
                "The number of travelers cannot be changed for an existing plan because "
                "flight and hotel bookings depend on traveler count. Please start a new trip if you have a different party size."
            )

    # Standalone currency change attempts (English & Arabic)
    currency_patterns = [
        r"\b(?:change|switch|convert|update)\s+(?:the\s+)?currency\b",
        r"\bswitch\s+(?:the\s+currency\s+)?to\s+(?:usd|eur|gbp|sar|aed|egp|inr|jpy)\b",
        r"\buse\s+(?:usd|eur|gbp|sar|aed|egp|inr|jpy)\s+instead\b",
        # Arabic currency change
        r"(?:غير|بدل|تغيير|تبديل)\s+(?:ال)?عملة",
        r"(?:استخدم|حول\s+إلى|حول\s+الي|خليها\s+بـ)\s+(?:دولار|يورو|جنيه|ريال|درهم)",
    ]
    for pat in currency_patterns:
        if regex_search(pat, msg_lower) and not regex_search(r"\b\d+[\d,]*\s*(?:egp|usd|eur|gbp|sar|aed)\b", msg_lower):
            return True, (
                "Currency cannot be changed for an existing plan. All budgets and activity costs "
                "are fixed to the plan's original currency."
            )

    return False, ""


def check_budget_change_guard(message: str, current_currency: str) -> tuple[bool, str, int | None, str | None]:
    """Guard: Overall budget change must have an amount and currency.
    
    Does NOT falsely trigger on activity-level phrases like 'low-cost activity'
    or 'hotel price'.
    """
    msg_lower = message.lower()

    # Search for amount and currency in message
    arabic_curr_regex = r"(?:جنيه|ج\.م|جم|دولار|يورو|ريال|درهم)"
    curr_regex = r"(?:" + "|".join([c.lower() for c in SUPPORTED_CURRENCIES]) + rf"|le|pounds|egp|{arabic_curr_regex})"
    match = regex_search(rf"(\d[\d,\.]*)\s*({curr_regex})\b", msg_lower, re.IGNORECASE)
    if not match:
        match = regex_search(rf"({curr_regex})\s*(\d[\d,\.]*)\b", msg_lower, re.IGNORECASE)
        if match:
            c_str, a_str = match.group(1), match.group(2)
        else:
            c_str, a_str = None, None
    else:
        a_str, c_str = match.group(1), match.group(2)

    amount = None
    currency = None
    arabic_map = {
        "جنيه": "EGP", "ج.م": "EGP", "جم": "EGP",
        "دولار": "USD", "يورو": "EUR", "ريال": "SAR", "درهم": "AED"
    }
    if a_str and c_str:
        try:
            cleaned_num = int(float(a_str.replace(",", "")))
            c_norm = c_str.upper()
            if c_norm in ("LE", "POUNDS"):
                c_norm = "EGP"
            elif c_str in arabic_map:
                c_norm = arabic_map[c_str]
            amount = cleaned_num
            currency = c_norm
        except ValueError:
            amount = None
    elif not match:
        # Check if amount is specified standalone with budget intent
        num_match = regex_search(r"\b(\d[\d,\.]*)\b", msg_lower)
        if num_match:
            try:
                amount = int(float(num_match.group(1).replace(",", "")))
            except ValueError:
                amount = None

    # Exclude activity-level or descriptive phrases that mention cost/price/budget
    activity_level_patterns = [
        r"\blow[\s-]cost\b",
        r"\bhigh[\s-]cost\b",
        r"\bcost\s+of\b",
        r"\bprice\s+of\b",
        r"\bticket\s+price\b",
        r"\bhotel\s+price\b",
        r"\bbudget\s+(?:hotel|inn|hostel|restaurant|meal|airline|flight|option|activity|room|resort)\b",
        r"\bcheaper\s+(?:hotel|inn|hostel|restaurant|meal|airline|flight|option|activity|room|resort)\b",
        # Arabic activity-level patterns
        r"نشاط\s+(?:رخيص|اقتصادي)",
        r"(?:فندق|مطعم|وجبة|طيران)\s+(?:رخيص|اقتصادي)",
        r"سعر\s+(?:الفندق|التذكرة|النشاط)",
    ]
    is_activity_level = any(regex_search(p, msg_lower) for p in activity_level_patterns)

    # Explicit overall trip budget change patterns
    overall_budget_patterns = [
        r"\b(?:make|set|change|increase|decrease|raise|lower|bump|cut|adjust|reduce)\s+(?:the\s+)?(?:total\s+)?budget\b",
        r"\b(?:total\s+)?budget\s+(?:is\s+)?(?:too\s+)?(?:high|low|much|little|tight)\b",
        r"\b(?:higher|lower|bigger|smaller|increased|reduced)\s+(?:total\s+)?budget\b",
        r"\b(?:make|have)\s+(?:the\s+trip\s+|it\s+)?(?:cheaper|more\s+expensive)\b",
        r"\bspend\s+(?:more|less)\s+(?:money\s+)?(?:in\s+total|overall|for\s+the\s+trip)\b",
        r"\bset\s+(?:the\s+budget\s+|it\s+)?to\s+\d+",
        # Arabic budget change patterns
        r"(?:غير|بدل|تغيير|تبديل|عدل|تعديل|خلي|اجعل|ضع|زود|ارفع|قلل|خفض)\s+(?:ال)?ميزانية",
        r"(?:ال)?ميزانية\s+(?:الجديدة|عالية|كبيرة|قليلة|صغيرة)",
    ]
    has_overall_budget_intent = any(regex_search(p, msg_lower) for p in overall_budget_patterns)

    # If it is purely an activity-level mention and NOT an overall budget command
    if is_activity_level and not has_overall_budget_intent and amount is None:
        return False, "", None, None

    if has_overall_budget_intent:
        if amount is None or currency is None:
            return True, "What total budget would you like me to use? Please include the amount and currency.", None, None

        if currency != current_currency:
            return True, (
                f"The plan's currency is {current_currency} and cannot be changed. "
                f"Please provide the budget in {current_currency}."
            ), None, None

        return False, "", amount, currency

    # Direct budget statement like "75000 EGP" or "Set it to 75000 EGP"
    if amount is not None and currency is not None:
        # Check if message is a budget set command
        if regex_search(r"\b(?:set|budget|it\s+to|change|ميزانية|خلي|اجعل)\b", msg_lower) or len(msg_lower.split()) <= 4:
            if currency != current_currency:
                return True, (
                    f"The plan's currency is {current_currency} and cannot be changed. "
                    f"Please provide the budget in {current_currency}."
                ), None, None
            return False, "", amount, currency

    return False, "", None, None


def check_dietary_limits_guard(message: str, profile: dict) -> tuple[bool, str]:
    """Guard: Never break dietary limits or profile food dislikes.
    
    Uses exact word boundaries and excludes false positives (e.g. eggplant != egg,
    minutes != nut).
    """
    msg_lower = message.lower()
    limits = profile.get("dietary_limits", []) or []
    dislikes = profile.get("food_dislikes", []) or []

    avoid_words = [
        "avoid", "no", "remove", "replace", "don't like", "dont like", "hate", "without", "free", "allerg",
        "تجنب", "بدون", "من غير", "بلاش", "لا تضع", "احذف", "استبدل", "لا أحب", "حساسية"
    ]

    # Check dietary limit patterns
    for limit in limits:
        patterns = DIETARY_FORBIDDEN_PATTERNS.get(limit, [])
        for pat in patterns:
            match = regex_search(pat, msg_lower)
            if match:
                matched_word = match.group(0)
                is_avoiding = any(regex_search(rf"{aw}.*{re.escape(matched_word)}", msg_lower) for aw in avoid_words)
                if not is_avoiding:
                    return True, (
                        f"Your profile specifies a {limit} diet, which excludes '{matched_word}'. "
                        f"Would you like to keep your {limit} preference, or make a specific exception?"
                    )

    # Check food dislikes
    for dislike in dislikes:
        d_lower = normalize_arabic(dislike.strip())
        if not d_lower:
            continue
        # Use word boundaries for exact dislike match (Arabic-normalized)
        if regex_search(rf"\b{re.escape(d_lower)}\b", msg_lower):
            is_avoiding = any(regex_search(rf"{aw}.*{re.escape(d_lower)}", msg_lower) for aw in avoid_words)
            if not is_avoiding:
                return True, (
                    f"Your profile lists '{dislike}' in your dislikes. "
                    f"Please confirm if you'd like to add this or choose an alternative."
                )

    return False, ""


def sanitize_plan_dietary(plan: dict, profile: dict) -> list[dict]:
    """Verify that food activities never violate dietary limits or dislikes."""
    changes = []
    limits = profile.get("dietary_limits", []) or []
    dislikes = [normalize_arabic(d.strip()) for d in (profile.get("food_dislikes", []) or []) if d.strip()]

    all_patterns = []
    for l in limits:
        all_patterns.extend(DIETARY_FORBIDDEN_PATTERNS.get(l, []))
    for d in dislikes:
        all_patterns.append(rf"\b{re.escape(d)}\b")

    for day in plan.get("itinerary", []):
        for act in day.get("activities", []):
            if act.get("category") != "food":
                continue
            text = act.get("title", "") + " " + act.get("description", "")
            for pat in all_patterns:
                if regex_search(pat, text):
                    old_title = act.get("title")
                    act["title"] = "Authentic Vegetarian Egyptian Meal"
                    act["description"] = "Fresh falafel, hummus, tahini, warm baladi bread, and seasonal salad."
                    changes.append({
                        "type": "replace_activity",
                        "description": f"Adjusted meal ({old_title}) to strictly respect dietary restrictions.",
                        "day": day.get("day", 1)
                    })
                    break
    return changes


# ---------------------------------------------------------------------------
# Deterministic Mock & Rule-Based Refinement Fallback
# ---------------------------------------------------------------------------

def chat_mock(
    plan: dict,
    trip: dict,
    profile: dict,
    history: list[dict],
    message: str,
    search_context: dict | None = None,
) -> dict[str, Any]:
    """Deterministic mock chat refine that satisfies contract §4.75 and DESIGN §5.3."""
    # Run Guards
    imm_triggered, imm_msg = check_immutable_fields_guard(message)
    if imm_triggered:
        return {
            "action": "needs_clarification",
            "message": imm_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    curr_code = trip.get("currency") or plan.get("currency") or "EGP"
    bg_triggered, bg_msg, new_budget, _ = check_budget_change_guard(message, curr_code)
    if bg_triggered:
        return {
            "action": "needs_clarification",
            "message": bg_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    diet_triggered, diet_msg = check_dietary_limits_guard(message, profile)
    if diet_triggered:
        return {
            "action": "needs_clarification",
            "message": diet_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    updated_plan = copy.deepcopy(plan)
    updated_trip = copy.deepcopy(trip)
    days = updated_plan.get("itinerary", [])
    city = trip.get("destination", {}).get("city", "Egypt")

    # 1. Budget Change
    if new_budget is not None and new_budget > 0:
        old_budget = updated_plan.get("total_budget", updated_trip.get("total_budget", 60000))
        updated_plan["total_budget"] = new_budget
        updated_trip["total_budget"] = new_budget

        hotel = int(new_budget * 0.40)
        food = int(new_budget * 0.20)
        activities = int(new_budget * 0.25)
        transport = new_budget - hotel - food - activities

        updated_plan["budget_split"] = {
            "hotel": hotel,
            "food": food,
            "activities": activities,
            "transport": transport,
        }

        if old_budget > 0:
            ratio = new_budget / old_budget
            for day in days:
                for act in day.get("activities", []):
                    if act.get("estimated_cost", 0) > 0 and act.get("category") != "hotel":
                        act["estimated_cost"] = max(0, int(act["estimated_cost"] * ratio))

        changes = [
            {
                "type": "budget_changed",
                "description": f"Changed the total budget from {old_budget} {curr_code} to {new_budget} {curr_code}."
            },
            {
                "type": "plan_regenerated",
                "description": "Recalculated the budget split and regenerated activities within the new budget."
            }
        ]

        return {
            "action": "updated",
            "message": f"Done. I increased the total budget from {old_budget} {curr_code} to {new_budget} {curr_code} and recalculated the budget split and activities.",
            "changes": changes,
            "plan": updated_plan,
            "trip": updated_trip,
        }

    # 2. Activity / Small Edit handling
    msg_lower = message.lower()
    changes = []

    # Handle seafood / vegetarian / romantic request (contract mock example)
    if "seafood" in msg_lower or "vegetarian" in msg_lower or "romantic" in msg_lower:
        day1 = days[0] if len(days) > 0 else None
        if day1:
            for act in day1.get("activities", []):
                if act.get("category") == "food":
                    act["title"] = "Vegetarian Egyptian Lunch"
                    act["description"] = "Fresh koshari, falafel and mezze on the terrace, completely vegetarian."
                    changes.append({
                        "type": "replace_activity",
                        "description": "Replaced seafood meals with vegetarian options.",
                        "day": 1
                    })
                    break

        day2 = days[1] if len(days) > 1 else (days[0] if days else None)
        if day2:
            new_id = f"act_{len(day2.get('activities', [])) + 101}"
            romantic_act = {
                "id": new_id,
                "title": "Romantic Sunset Dinner for Two",
                "description": f"Candlelit dinner overlooking the scenic coastline in {city}.",
                "time_slot": "evening",
                "estimated_cost": 1200,
                "category": "food"
            }
            day2["activities"].append(romantic_act)
            changes.append({
                "type": "add_activity",
                "description": "Added a romantic sunset dinner for two.",
                "day": day2.get("day", 2)
            })

        return {
            "action": "updated",
            "message": "Done. I replaced the seafood meals with vegetarian options and added a romantic sunset dinner for two on day 2.",
            "changes": changes,
            "plan": updated_plan,
            "trip": updated_trip,
        }

    # Handle removing activity
    if "remove" in msg_lower or "delete" in msg_lower or "cancel" in msg_lower:
        removed_act_title = None
        for day in days:
            acts = day.get("activities", [])
            for i, act in enumerate(acts):
                # Search matching word in title
                words = [w for w in msg_lower.split() if len(w) > 3 and w not in ["remove", "delete", "cancel", "please"]]
                if any(w in act.get("title", "").lower() for w in words) or (i == len(acts) - 1 and len(acts) > 1):
                    removed_act_title = act.get("title")
                    del acts[i]
                    changes.append({
                        "type": "remove_activity",
                        "description": f"Removed '{removed_act_title}'.",
                        "day": day.get("day", 1)
                    })
                    break
            if removed_act_title:
                break

        if removed_act_title:
            return {
                "action": "updated",
                "message": f"Done. I removed '{removed_act_title}' from your itinerary.",
                "changes": changes,
                "plan": updated_plan,
                "trip": updated_trip,
            }

    # Contextual activity addition based on user message keywords
    target_day = days[1] if len(days) > 1 else (days[0] if days else None)
    if target_day:
        act_id = f"act_{len(target_day.get('activities', [])) + 201}"
        if "museum" in msg_lower or "history" in msg_lower:
            new_title = f"{city} Cultural Museum Visit"
            new_desc = f"Explore historical artifacts and local heritage in {city}."
            new_cost = 300
            new_cat = "activities"
            new_slot = "morning"
        elif "snorkeling" in msg_lower or "diving" in msg_lower or "beach" in msg_lower:
            new_title = "Guided Snorkeling Excursion"
            new_desc = "Discover vibrant coral reefs with experienced local guides."
            new_cost = 1500
            new_cat = "activities"
            new_slot = "morning"
        elif "low-cost" in msg_lower or "cheap" in msg_lower or "free" in msg_lower:
            new_title = "Self-Guided Old Town Heritage Walk"
            new_desc = f"Walk through the historic streets and bustling bazaars of {city}."
            new_cost = 0
            new_cat = "activities"
            new_slot = "afternoon"
        elif "dinner" in msg_lower or "food" in msg_lower or "eat" in msg_lower:
            new_title = f"Authentic Dinner in {city}"
            new_desc = "Enjoy freshly prepared regional Egyptian delicacies."
            new_cost = 600
            new_cat = "food"
            new_slot = "evening"
        else:
            new_title = f"Personalized Highlight in {city}"
            new_desc = f"Special activity requested: {message[:60]}."
            new_cost = 400
            new_cat = "activities"
            new_slot = "afternoon"

        target_day["activities"].append({
            "id": act_id,
            "title": new_title,
            "description": new_desc,
            "time_slot": new_slot,
            "estimated_cost": new_cost,
            "category": new_cat
        })
        changes.append({
            "type": "add_activity",
            "description": f"Added '{new_title}' to Day {target_day.get('day', 1)}.",
            "day": target_day.get("day", 1)
        })

    diet_changes = sanitize_plan_dietary(updated_plan, profile)
    changes.extend(diet_changes)

    return {
        "action": "updated",
        "message": f"Done. I updated your plan to include '{new_title}'.",
        "changes": changes,
        "plan": updated_plan,
        "trip": updated_trip,
    }


# ---------------------------------------------------------------------------
# LLM Execution: Gemini (Primary) with Groq (Backup)
# ---------------------------------------------------------------------------

def _build_prompt_content(plan: dict, trip: dict, profile: dict, history: list[dict], message: str) -> tuple[str, str]:
    system_prompt = (
        "You are Ayn's intelligent travel assistant specialized in refining draft travel itineraries in Egypt (contract §4.75).\n"
        "You receive the current trip, current plan, user profile, chat history, and new user refinement message.\n\n"
        "Decide between:\n"
        "1. 'needs_clarification': if the user request is ambiguous, lacks required parameters (such as budget without amount/currency), or attempts to change destination/currency/travelers.\n"
        "2. 'updated': if you applied the requested activity changes or budget adjustment.\n\n"
        "OUTPUT FORMAT: Return ONLY valid JSON with this exact schema:\n"
        "{\n"
        "  \"action\": \"updated\" or \"needs_clarification\",\n"
        "  \"message\": \"Concise assistant response to the user\",\n"
        "  \"changes\": [{\"type\": \"replace_activity\"|\"add_activity\"|\"remove_activity\"|\"budget_changed\", \"description\": \"...\", \"day\": 1}],\n"
        "  \"plan\": <full updated plan object or null if needs_clarification>,\n"
        "  \"trip\": <updated trip object or null if needs_clarification>\n"
        "}\n\n"
        "RULES:\n"
        "- If action is 'needs_clarification', 'plan' and 'trip' MUST be null and 'changes' must be [].\n"
        "- If action is 'updated', the budget_split sum (hotel + food + activities + transport) MUST equal total_budget exactly.\n"
        "- Never violate the user's dietary limits or food dislikes."
    )

    user_payload = {
        "current_trip": trip,
        "current_plan": plan,
        "user_profile": profile,
        "chat_history": history[-6:] if history else [],
        "user_message": message,
    }
    return system_prompt, json.dumps(user_payload, indent=2)


def _call_gemini(system_prompt: str, user_content: str) -> dict[str, Any] | None:
    """Call Google Gemini as primary LLM."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "":
        return None

    try:
        from google import genai
        from google.genai import types

        model_name = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
        if model_name in ("gemini-1.5-flash", "gemini-2.5-flash", "gemini-flash-latest"):
            model_name = "gemini-flash-lite-latest"

        http_options = types.HttpOptions(
            timeout=15000,
        )
        client = genai.Client(api_key=api_key, http_options=http_options)

        response = client.models.generate_content(
            model=model_name,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=4096,
            ),
        )

        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in text:
            text = text.split("```", 1)[1].split("```", 1)[0].strip()

        return json.loads(text)
    except Exception as exc:
        logger.warning("Gemini primary call failed: %s. Falling back to Groq.", exc)
        return None


def _call_groq(system_prompt: str, user_content: str) -> dict[str, Any] | None:
    """Call Groq as backup LLM."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("gsk_your") or api_key.strip() == "":
        return None

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        if model_name.startswith("groq/"):
            model_name = model_name[5:]

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=4096,
        )

        text = response.choices[0].message.content.strip()
        return json.loads(text)
    except Exception as exc:
        logger.warning("Groq backup call failed: %s.", exc)
        return None


def run_llm_chat(
    plan: dict,
    trip: dict,
    profile: dict,
    history: list[dict],
    message: str,
    search_context: dict | None = None,
) -> dict[str, Any]:
    """Execute LLM refinement with Gemini (primary) -> Groq (backup) -> Mock."""
    system_prompt, user_content = _build_prompt_content(plan, trip, profile, history, message)

    result = _call_gemini(system_prompt, user_content)
    if result is None:
        result = _call_groq(system_prompt, user_content)

    if result and isinstance(result, dict):
        action = result.get("action")
        if action == "needs_clarification":
            return {
                "action": "needs_clarification",
                "message": result.get("message", "Could you please clarify your request?"),
                "changes": [],
                "plan": None,
                "trip": None,
            }

        if action == "updated" and result.get("plan"):
            updated_p = result["plan"]
            bs = updated_p.get("budget_split", {})
            total = updated_p.get("total_budget", plan.get("total_budget", 0))
            if sum(bs.values()) != total:
                hotel = bs.get("hotel", 0)
                food = bs.get("food", 0)
                acts = bs.get("activities", 0)
                bs["transport"] = total - hotel - food - acts
                updated_p["budget_split"] = bs

            sanitize_plan_dietary(updated_p, profile)

            return {
                "action": "updated",
                "message": result.get("message", "Done. I updated your plan."),
                "changes": result.get("changes", []),
                "plan": updated_p,
                "trip": result.get("trip") or trip,
            }

    # Fallback to deterministic rule-based refinement
    return chat_mock(plan, trip, profile, history, message, search_context)


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def chat(
    plan: dict,
    trip: dict,
    profile: dict,
    history: list[dict],
    message: str,
    search_context: dict | None = None,
    force_mock: bool = False,
) -> dict[str, Any]:
    """Single function called by the backend (contract §4.75)."""
    # Guard 1: Immutable fields
    imm_triggered, imm_msg = check_immutable_fields_guard(message)
    if imm_triggered:
        return {
            "action": "needs_clarification",
            "message": imm_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    # Guard 2: Budget format
    curr_code = trip.get("currency") or plan.get("currency") or "EGP"
    bg_triggered, bg_msg, _, _ = check_budget_change_guard(message, curr_code)
    if bg_triggered:
        return {
            "action": "needs_clarification",
            "message": bg_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    # Guard 3: Dietary conflicts
    diet_triggered, diet_msg = check_dietary_limits_guard(message, profile)
    if diet_triggered:
        return {
            "action": "needs_clarification",
            "message": diet_msg,
            "changes": [],
            "plan": None,
            "trip": None,
        }

    if force_mock:
        return chat_mock(plan, trip, profile, history, message, search_context)

    return run_llm_chat(plan, trip, profile, history, message, search_context)
