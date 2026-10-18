"""Prime Tavily search cache for the 5 demo destinations.

Usage:
    python scripts/prime_cache.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Windows console encoding safety
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.tools.tavily_tool import CACHE_DIR, _cache_key, _load_cache, _save_cache, reset_search_counter, execute_tavily_search

DESTINATIONS = [
    "Cairo",
    "Alexandria",
    "Luxor",
    "Aswan",
    "Sharm El Sheikh",
]

# Fallback verified mock results in case of network or API key issues
PRESET_DATA = {
    "Cairo": "- Egyptian Museum: World-renowned collection of ancient artifacts in Tahrir Square\n- Khan el-Khalili: Historic major souk in the Islamic district of Cairo\n- Al-Azhar Park: Stunning landscaped gardens with panoramic citadel views",
    "Alexandria": "- Bibliotheca Alexandrina: Major library and cultural center on the Mediterranean\n- Citadel of Qaitbay: 15th-century defensive fortress on the coast\n- Stanley Bridge: Scenic waterfront landmark popular for sunset strolls",
    "Luxor": "- Karnak Temple: Vast open-air museum and religious complex\n- Valley of the Kings: Ancient royal tombs cut into rock in the Theban hills\n- Luxor Temple: Grand sandstone temple complex located right on the Nile bank",
    "Aswan": "- Philae Temple: Island temple complex dedicated to goddess Isis\n- Nubian Village: Colorful cultural settlements on the west bank of the Nile\n- Aswan High Dam: Modern engineering marvel impounding Lake Nasser",
    "Sharm El Sheikh": "- Ras Mohammed National Park: Spectacular coral reefs and rich marine life\n- Naama Bay: Lively promenade with dining, shopping, and beachside cafes\n- Sharm Old Market: Traditional bazaar and towering Al Sahaba Mosque",
}


def main():
    print("=" * 60)
    print("Priming Tavily Search Cache for 5 Demo Destinations")
    print("=" * 60)

    for city in DESTINATIONS:
        query = f"top attractions restaurants in {city} Egypt"
        cached = _load_cache(query)
        if cached:
            print(f"  [CACHE HIT]  {city:<18} (already cached)")
        else:
            reset_search_counter()
            res = execute_tavily_search(query)
            if "No results" in res or "Search error" in res:
                # Seed preset
                preset = PRESET_DATA.get(city, "")
                _save_cache(query, preset)
                print(f"  [SEEDED]     {city:<18} (saved preset verified data)")
            else:
                print(f"  [FETCHED]    {city:<18} (saved from live Tavily query)")

    cache_files = list(CACHE_DIR.glob("*.txt")) if CACHE_DIR.exists() else []
    print("\n" + "=" * 60)
    print(f"Cache location: {CACHE_DIR}")
    print(f"Total cached files: {len(cache_files)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
