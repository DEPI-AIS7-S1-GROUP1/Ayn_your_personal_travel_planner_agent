"""Photos for the hotel cards, from Wikimedia Commons (free, no API key).

The LLM tiers invent image links (https://example.com/hot_001.jpg) and the templates point
at /images/hotels/placeholder-1.jpg, which does not exist, so every card showed a grey box.
After a plan is built, each hotel without a real photo gets one, in this order:
  1. a Commons photo whose file name has the hotel's own name ("Hilton Hotel, Dahab")
  2. a photo of the area (beach, promenade), a different one per card, never of another hotel
  3. the city's Wikipedia photo
Lookups run in parallel with short timeouts and are cached on disk for a week; when nothing
is found the card keeps its placeholder, as before.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, wait
from pathlib import Path
from urllib.parse import quote, urlsplit

import httpx

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "images"
CACHE_TTL_S = 7 * 24 * 3600
REQUEST_TIMEOUT_S = float(os.getenv("HOTEL_IMAGE_TIMEOUT_S", "6"))
TOTAL_WAIT_S = float(os.getenv("HOTEL_IMAGE_TOTAL_WAIT_S", "8"))
THUMB_WIDTH = 800
# Wikimedia rate-limits clients that do not say who they are and how to reach them.
HEADERS = {"User-Agent": "AynTravelPlanner/1.0 "
                         "(https://github.com/DEPI-AIS7-S1-GROUP1/Ayn_your_personal_travel_planner_agent) httpx"}
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
MAX_PARALLEL = 2  # more parallel requests get 429 from Wikimedia

_PHOTO_FILE = re.compile(r"\.(?:jpe?g|png|webp)$", re.IGNORECASE)
_ELSEWHERE = re.compile(r"las vegas|vegas|nevada|macau", re.IGNORECASE)
# Words that do not tell one hotel from another.
_GENERIC = frozenset(
    "hotel hotels resort resorts spa inn lodge suites suite camp beach the and by of el al "
    "egypt boutique house village club garden gardens palace plaza sea view red nile desert oasis "
    "star stars blue golden grand royal new central budget city bay coral".split()
)
# A photo of a place to stay: never shown on another hotel's card.
_LODGING = re.compile(r"\b(hotel|resort|inn|hostel|camp|lodge|motel|suites)\b", re.IGNORECASE)


def needs_photo(url: str | None) -> bool:
    """True for links that cannot be a real photo: empty, relative, or a made-up example.com host."""
    if not url or not url.startswith(("http://", "https://")):
        return True
    host = urlsplit(url).netloc.casefold()
    return host == "example.com" or host.endswith(".example.com") or host.endswith("example.org")


def _cache_get(key: str):
    path = CACHE_DIR / f"{hashlib.sha256(key.encode()).hexdigest()[:24]}.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - payload["saved_at"] < CACHE_TTL_S:
            return payload["value"]
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return None


def _cache_put(key: str, value) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path = CACHE_DIR / f"{hashlib.sha256(key.encode()).hexdigest()[:24]}.json"
        path.write_text(json.dumps({"saved_at": time.time(), "value": value}), encoding="utf-8")
    except OSError as exc:
        logger.warning("Could not write image cache (%s)", type(exc).__name__)


def _get(url: str, params: dict) -> dict:
    """GET JSON; one short retry on 429 (Wikimedia limits bursts from anonymous clients)."""
    for attempt in range(2):
        response = httpx.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT_S)
        if response.status_code == 429 and attempt == 0:
            retry_after = response.headers.get("retry-after", "1")
            time.sleep(min(2.0, float(retry_after)) if retry_after.isdigit() else 1.0)
            continue
        response.raise_for_status()
        return response.json()
    return {}


def commons_photos(query: str, limit: int = 8) -> list[dict]:
    """[{title, url}] of photos on Wikimedia Commons matching the query (cached)."""
    key = f"commons|{query.casefold()}|{limit}"
    cached = _cache_get(key)
    if cached is not None:
        return cached
    data = _get(COMMONS_API, {
        "action": "query", "format": "json", "generator": "search", "gsrsearch": query,
        "gsrnamespace": 6, "gsrlimit": limit, "prop": "imageinfo", "iiprop": "url",
        "iiurlwidth": THUMB_WIDTH,
    })
    pages = sorted((data.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    photos = [
        {"title": p["title"], "url": p["imageinfo"][0].get("thumburl") or p["imageinfo"][0]["url"]}
        for p in pages
        if p.get("imageinfo") and _PHOTO_FILE.search(p.get("title", ""))
        # "Luxor hotel" also finds the Luxor in Las Vegas.
        and not _ELSEWHERE.search(p.get("title", ""))
    ]
    _cache_put(key, photos)
    return photos


def city_photo(city: str) -> str | None:
    """The photo of the city's English Wikipedia page, found by search so "Siwa" reaches
    "Siwa Oasis" (cached)."""
    key = f"wikipedia|{city.casefold()}"
    cached = _cache_get(key)
    if cached is not None:
        return cached or None
    data = _get(WIKIPEDIA_API, {
        "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{city} Egypt",
        "gsrlimit": 1, "prop": "pageimages", "piprop": "thumbnail", "pithumbsize": THUMB_WIDTH,
    })
    pages = list((data.get("query") or {}).get("pages", {}).values())
    image = ((pages[0].get("thumbnail") or {}).get("source") if pages else None) or ""
    _cache_put(key, image)
    return image or None


def _distinctive_words(name: str, city: str) -> list[str]:
    city_words = set(city.casefold().split())
    return [w for w in re.findall(r"[\w'’]+", name.casefold())
            if len(w) > 2 and w not in _GENERIC and w not in city_words]


def _matches(title: str, words: list[str]) -> bool:
    """Every distinctive word must be in the file name: "Sea View Resort" must not match
    "Red Sea Anemonefish" on "sea" alone."""
    title = title.casefold()
    return bool(words) and all(w in title for w in words)


def photo_for_hotel(name: str, city: str) -> str | None:
    """A Commons photo of this hotel, or None. The file name must contain a distinctive word of
    the hotel's name, so "Swiss Inn Resort Dahab" never gets a picture of another hotel.
    Commons needs every search word in the file, so the short form ("Hilton Dahab") is tried too."""
    words = _distinctive_words(name, city)
    if not words:
        return None
    queries = [name if city.casefold() in name.casefold() else f"{name} {city}", f"{' '.join(words)} {city}"]
    for query in dict.fromkeys(queries):
        for photo in commons_photos(query):
            if _matches(photo["title"], words):
                return photo["url"]
    return None


def add_hotel_photos(hotels: list, city: str) -> int:
    """Set image_url on hotels that have no real photo. Returns how many got one. Never raises.

    HOTEL_PHOTOS=off skips it (the tests set this so they never call Wikimedia).
    """
    if os.getenv("HOTEL_PHOTOS", "on").strip().lower() in ("0", "off", "false", "no"):
        return 0
    missing = [h for h in hotels if needs_photo(getattr(h, "image_url", None))]
    if not missing:
        return 0

    def own_photo(hotel):
        try:
            return photo_for_hotel(hotel.name, city)
        except Exception as exc:
            logger.warning("Hotel photo lookup failed for %r (%s)", hotel.name, type(exc).__name__)
            return None

    def city_hotels():
        try:
            return commons_photos(f"hotel {city} Egypt", limit=10)
        except Exception as exc:
            logger.warning("City hotel photos failed for %r (%s)", city, type(exc).__name__)
            return []

    def area_photos():
        try:
            return commons_photos(f"{city} Egypt", limit=12)
        except Exception as exc:
            logger.warning("Area photos failed for %r (%s)", city, type(exc).__name__)
            return []

    def city_page():
        try:
            return city_photo(city)
        except Exception as exc:
            logger.warning("City photo failed for %r (%s)", city, type(exc).__name__)
            return None

    pool = ThreadPoolExecutor(max_workers=MAX_PARALLEL)
    generic = pool.submit(city_hotels)
    own = [pool.submit(own_photo, h) for h in missing]
    area = pool.submit(area_photos)
    page = pool.submit(city_page)
    wait([*own, generic, area, page], timeout=TOTAL_WAIT_S)
    pool.shutdown(wait=False, cancel_futures=True)

    def result(future, default):
        return future.result() if future.done() and not future.exception() else default

    found = [result(f, None) for f in own]
    city_list = result(generic, [])
    # A city photo named after one of these hotels belongs to that hotel only.
    for i, hotel in enumerate(missing):
        if not found[i]:
            words = _distinctive_words(hotel.name, city)
            found[i] = next((p["url"] for p in city_list if _matches(p["title"], words)), None)
    used = {h.image_url for h in hotels if not needs_photo(getattr(h, "image_url", None))}
    used.update(u for u in found if u)
    # Spares show the area, not a place to stay, so no card shows somebody else's hotel.
    spare = [p["url"] for p in result(area, []) if p["url"] not in used and not _LODGING.search(p["title"])]
    fallback = result(page, None)

    filled = 0
    for hotel, url in zip(missing, found):
        if not url and spare:
            url = spare.pop(0)
        url = url or fallback
        if url:
            hotel.image_url = url
            filled += 1
    logger.info("Hotel photos: %d of %d filled (%d by hotel name)", filled, len(missing), sum(1 for u in found if u))
    return filled
