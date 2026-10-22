"""Arabic language helpers for plan generation and safety matching (A10 + A11)."""

from __future__ import annotations

import re

ARABIC_LANGUAGE_RULE = (
    "ARABIC LANGUAGE RULE: Write the `title` and `description` fields in Arabic. "
    "Keep all JSON keys, enum values (morning/afternoon/evening, hotel/food/activities/transport), "
    "IDs, currency codes, and dates in English."
)

_ARABIC_LETTER = re.compile(r"[\u0600-\u06FF]")

# Arabic names of the cities a trip can go to (same list as the frontend's cityTranslations),
# so Arabic text says "\u063A\u062F\u0627\u0621 \u0641\u064A \u062F\u0647\u0628" and not "\u063A\u062F\u0627\u0621 \u0641\u064A Dahab".
CITY_NAMES_AR = {
    "Cairo": "\u0627\u0644\u0642\u0627\u0647\u0631\u0629", "Giza": "\u0627\u0644\u062C\u064A\u0632\u0629", "Alexandria": "\u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", "Sharm El Sheikh": "\u0634\u0631\u0645 \u0627\u0644\u0634\u064A\u062E",
    "Hurghada": "\u0627\u0644\u063A\u0631\u062F\u0642\u0629", "Luxor": "\u0627\u0644\u0623\u0642\u0635\u0631", "Aswan": "\u0623\u0633\u0648\u0627\u0646", "Dahab": "\u062F\u0647\u0628", "Marsa Alam": "\u0645\u0631\u0633\u0649 \u0639\u0644\u0645",
    "Siwa Oasis": "\u0648\u0627\u062D\u0629 \u0633\u064A\u0648\u0629", "Siwa": "\u0633\u064A\u0648\u0629", "El Gouna": "\u0627\u0644\u062C\u0648\u0646\u0629", "Faiyum": "\u0627\u0644\u0641\u064A\u0648\u0645",
    "Marsa Matrouh": "\u0645\u0631\u0633\u0649 \u0645\u0637\u0631\u0648\u062D", "Port Said": "\u0628\u0648\u0631\u0633\u0639\u064A\u062F", "Ismailia": "\u0627\u0644\u0625\u0633\u0645\u0627\u0639\u064A\u0644\u064A\u0629", "Suez": "\u0627\u0644\u0633\u0648\u064A\u0633",
    "Beni Suef": "\u0628\u0646\u064A \u0633\u0648\u064A\u0641", "Minya": "\u0627\u0644\u0645\u0646\u064A\u0627", "Asyut": "\u0623\u0633\u064A\u0648\u0637", "Sohag": "\u0633\u0648\u0647\u0627\u062C", "Qena": "\u0642\u0646\u0627",
    "New Valley": "\u0627\u0644\u0648\u0627\u062F\u064A \u0627\u0644\u062C\u062F\u064A\u062F", "Kafr El Sheikh": "\u0643\u0641\u0631 \u0627\u0644\u0634\u064A\u062E", "Damietta": "\u062F\u0645\u064A\u0627\u0637", "Tanta": "\u0637\u0646\u0637\u0627",
    "Mansoura": "\u0627\u0644\u0645\u0646\u0635\u0648\u0631\u0629", "Zagazig": "\u0627\u0644\u0632\u0642\u0627\u0632\u064A\u0642", "Banha": "\u0628\u0646\u0647\u0627", "Damanhur": "\u062F\u0645\u0646\u0647\u0648\u0631",
    "Matrouh": "\u0645\u0637\u0631\u0648\u062D", "Arish": "\u0627\u0644\u0639\u0631\u064A\u0634",
}


def city_name_ar(city: str) -> str:
    """Arabic name of a city, or the name as given when it is not in the list."""
    return CITY_NAMES_AR.get(city.strip(), city)


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
