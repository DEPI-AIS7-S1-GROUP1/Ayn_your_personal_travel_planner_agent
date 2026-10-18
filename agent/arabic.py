"""Arabic language helpers for plan generation and safety matching (A10 + A11)."""

from __future__ import annotations

import re

ARABIC_LANGUAGE_RULE = (
    "ARABIC LANGUAGE RULE: Write the `title` and `description` fields in Arabic. "
    "Keep all JSON keys, enum values (morning/afternoon/evening, hotel/food/activities/transport), "
    "IDs, currency codes, and dates in English."
)

_ARABIC_LETTER = re.compile(r"[\u0600-\u06FF]")


def trip_language(trip: dict | None) -> str:
    """Return a short language code from a trip dict (`ar` or `en`)."""
    raw = str((trip or {}).get("language") or "en").strip().lower()
    if raw in ("ar", "arabic", "ar-eg", "ar_eg"):
        return "ar"
    return "en"


def is_arabic_trip(trip: dict | None) -> bool:
    return trip_language(trip) == "ar"


def arabic_language_rule_block(trip: dict | None) -> str:
    """Prompt injection used by Gemini, Groq, and the CrewAI planner task."""
    if not is_arabic_trip(trip):
        return ""
    return f"\n{ARABIC_LANGUAGE_RULE}\n"


def normalize_arabic(text: str) -> str:
    """Normalize Arabic so alef variants and taa marbuta compare equal.

    أ / إ / آ / ٱ → ا,  ة → ه,  ى → ي. Also lowercases Latin letters.
    """
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r"[أإآٱ]", "ا", text)
    text = text.replace("ة", "ه")
    text = text.replace("ى", "ي")
    return text


def regex_search(pattern: str, text: str, flags: int = 0) -> re.Match[str] | None:
    """Search after normalizing Arabic on both the pattern and the haystack."""
    return re.search(normalize_arabic(pattern), normalize_arabic(text), flags)


def contains_arabic(text: str) -> bool:
    return bool(_ARABIC_LETTER.search(text or ""))
