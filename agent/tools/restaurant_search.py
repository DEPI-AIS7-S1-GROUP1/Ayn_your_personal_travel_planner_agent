"""Real restaurant names for meals, from one Tavily search per trip.

Without this, food activities only said "Lunch in Dahab": Tier 1 searched the web but the
other tiers did not, and nothing asked for a restaurant name. One search runs before the
tiers (cached 72 h per query, so repeat trips to a city cost nothing) and every tier gets
the same evidence: the LLM tiers in their prompt, the template tier as a list of names.
"""

from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

MAX_SOURCES = 5
SNIPPET_CHARS = 350  # per source in the prompt: ~5 x 350 chars keeps Groq under its tokens/minute
MAX_NAMES = 12

# A name is 1-5 capitalised words, with "el", "del", "&"... allowed between them:
# "Shark Restaurant", "Cafe del Sur", "Restaurant El-Kababgy Luxor", "Lindy's Dahab Restaurant".
_WORD = r"[A-Z][\w'’&-]*"
_JOIN = r"(?:el|al|de|del|la|le|of|the|and|&)"
_NAME = rf"(?:{_JOIN}\s+)?{_WORD}(?:\s+(?:{_JOIN}\s+)?{_WORD}){{0,4}}?"
# Where the name stops: punctuation, a lowercase word, "I", or a capitalised word that starts a
# sentence ("Seaduction For a nice...").
_END = rf"(?=\s*(?:[\[(|·,.:;–—]|$)|\s+(?:I\b|(?!{_JOIN}\b)[a-z]|[A-Z][a-z]*\s+[a-z]))"

# Restaurant names inside typical list pages:
#   TripAdvisor  "1. El Tarboush. 4.9 of 5 bubbles"  /  "2. Shark Restaurant · (1,367 reviews)"
#   blogs        "#### King Chicken King Chicken is..."  /  "6 Darwish Seafood – For amazing seafood"
#   lists        "include: Al Sahaby Lane Restaurant | Sofra Restaurant & Cafè | el Tarboush."
_NAME_PATTERNS = (
    re.compile(rf"(?:^|\s)\d{{1,2}}\.\s+({_NAME})(?=\.\s*\d|\s*·)"),
    re.compile(rf"#{{2,4}}\s*(?:\d{{1,2}}\.\s*)?({_NAME}){_END}"),
    re.compile(rf"(?:^|\s)\d{{1,2}}\s+({_NAME})\s+[–—-]\s"),
    re.compile(rf"(?:[:|]\s*)({_NAME})(?=\s*[|.])"),
)
# Headings and list titles that are not a restaurant.
_NOT_A_NAME = re.compile(
    r"\b(best|top|where|eat|eats|guide|reviews?|restaurants|things to do|updated|tips|budget|"
    r"occasion|tripadvisor|halal|vegan|vegetarian|gluten|plan your visit)\b",
    re.IGNORECASE,
)
# One-word matches that are page text, not a restaurant ("Namaste" or "Byblos" pass).
_COMMON_WORDS = frozenset(
    "restaurant cafe café dining international egyptian local seafood food menu plan other must "
    "see what how can why when who the this read more home about location price prices open hours "
    "view map channel frequently asked dinner lunch breakfast street square city egypt leave".split()
)


def _clean_name(name: str) -> str:
    """Strip punctuation and a repeated heading ("King Chicken King Chicken" -> "King Chicken")."""
    words = name.strip(" .,:;-–—*").split()
    for cut in range(1, len(words)):
        if words[cut] == words[0]:
            words = words[:cut]
            break
    return " ".join(words)


def build_query(trip: dict, profile: dict) -> str:
    """One query per city and dietary limits; food likes are left to the LLM so the cache is shared."""
    city = trip["destination"]["city"]
    limits = " ".join(str(d).replace("-", " ") for d in profile.get("dietary_limits") or [])
    return re.sub(r"\s+", " ", f"best restaurants in {city} Egypt {limits}").strip()


def search_restaurants(trip: dict, profile: dict) -> list[dict]:
    """Search results as [{title, url, content}], or [] when search is off or fails.

    Never raises: a plan without restaurant names is still a plan.
    """
    try:
        from agent.tools.tavily_tool import execute_tavily_search
    except Exception as exc:  # crewai/tavily not installed
        logger.warning("Restaurant search unavailable (%s)", type(exc).__name__)
        return []

    query = build_query(trip, profile)
    try:
        payload = json.loads(execute_tavily_search(query, enforce_limit=False))
    except Exception as exc:
        logger.warning("Restaurant search failed (%s)", type(exc).__name__)
        return []
    if payload.get("status") != "ok":
        logger.warning("Restaurant search returned %s (%s)", payload.get("status"), payload.get("error_type", ""))
        return []

    evidence = [
        {
            "title": str(r.get("title") or "")[:120],
            "url": r.get("url"),
            # The prompt gets a short snippet; names are read from the whole cached text.
            "content": re.sub(r"\s+", " ", str(r.get("content") or ""))[:SNIPPET_CHARS],
            "full_content": re.sub(r"\s+", " ", str(r.get("content") or "")),
        }
        for r in payload["results"][:MAX_SOURCES]
    ]
    logger.info("Restaurant search: %d sources (%s)", len(evidence), "cache" if payload.get("cached") else "live")
    return evidence


def restaurant_names(evidence: list[dict], city: str = "") -> list[str]:
    """Restaurant names that appear in the search snippets, best effort, in order of appearance."""
    names: list[str] = []
    seen: set[str] = set()
    for source in evidence:
        text = str(source.get("full_content") or source.get("content") or "")
        for pattern in _NAME_PATTERNS:
            for match in pattern.finditer(text):
                name = _clean_name(match.group(1))
                key = name.casefold()
                if (len(name) < 3 or key in seen or _NOT_A_NAME.search(name)
                        or (" " not in name and key in _COMMON_WORDS)
                        or (city and key == city.casefold())):
                    continue
                seen.add(key)
                names.append(name)
    return names[:MAX_NAMES]


_BAR = re.compile(r"\b(bar|pub|lounge|wine|beer|brewery|tavern)\b", re.IGNORECASE)


def suitable_names(names: list[str], profile: dict) -> list[str]:
    """Drop bars and pubs for a halal profile ("Yalla Bar Dahab" is not a halal lunch)."""
    if "halal" not in (profile.get("dietary_limits") or []):
        return names
    return [n for n in names if not _BAR.search(n)]


def restaurant_rule_block(evidence: list[dict], trip: dict) -> str:
    """Prompt section for the LLM tiers. Empty when there is no evidence (prompt unchanged)."""
    if not evidence:
        return ""
    names = restaurant_names(evidence, trip["destination"]["city"])
    sources = "\n".join(
        f"[{i}] {s['title']}: {s['content']}" for i, s in enumerate(evidence, start=1)
    )
    found = f"Names found: {', '.join(names)}\n" if names else ""
    return (
        "\nREAL RESTAURANTS (from a live web search; use only these for meals):\n"
        f"{found}Sources:\n{sources}\n"
        'RESTAURANT RULE: every activity with category "food" MUST name one specific restaurant '
        'from the sources above in its title, e.g. "Lunch at Shark Restaurant". In an Arabic plan keep '
        'the restaurant name in Latin letters exactly as written, e.g. "غداء في Shark Restaurant". '
        "In the description name one or two dishes to order there that fit the food likes, plus the "
        'area when the sources give it, e.g. "Try the koshari and ta\'ameya; a local favourite in '
        'Mashraba." Pick restaurants '
        "that fit the food likes, food dislikes and dietary limits (no bars or pubs when the limits "
        "include halal), and use a different one for each "
        "meal when there are enough. Never invent a restaurant name; if none fits, use a generic "
        'title such as "Lunch at a local seafood restaurant".\n'
    )


def named_meal_count(itinerary: list, names: list[str]) -> tuple[int, int]:
    """(food activities naming a found restaurant, all food activities), for the log."""
    meals = [a for day in itinerary for a in day.activities if a.category == "food"]
    lowered = [n.casefold() for n in names]
    named = sum(1 for a in meals if any(n in a.title.casefold() for n in lowered))
    return named, len(meals)
