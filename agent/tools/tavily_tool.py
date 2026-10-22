"""Tavily search with structured, local, expiring evidence cache."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

try:
    from crewai.tools import tool
except ImportError:
    def tool(name: str):
        def decorator(fn):
            return fn
        return decorator

try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None

logger = logging.getLogger(__name__)
CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "tavily"
MAX_SEARCH_QUERIES = max(1, int(os.getenv("TAVILY_MAX_SEARCH_QUERIES", "2")))
MAX_RESULTS = max(1, min(10, int(os.getenv("TAVILY_MAX_RESULTS", "5"))))
MAX_CONTENT_CHARS = max(200, int(os.getenv("TAVILY_MAX_CONTENT_CHARS", "1500")))
SEARCH_DEPTH = os.getenv("TAVILY_SEARCH_DEPTH", "basic").strip().lower()
CACHE_TTL_HOURS = max(1, int(os.getenv("TAVILY_CACHE_TTL_HOURS", "72")))
_search_counter = 0
_search_lock = threading.Lock()
_query_lock = threading.Lock()


def _normalized_query(query: str) -> str:
    return re.sub(r"\s+", " ", query).strip().casefold()


def _cache_key(query: str) -> str:
    settings = f"{_normalized_query(query)}|{SEARCH_DEPTH}|{MAX_RESULTS}|{MAX_CONTENT_CHARS}"
    return hashlib.sha256(settings.encode("utf-8")).hexdigest()[:24]


def _cache_path(query: str) -> Path:
    return CACHE_DIR / f"{_cache_key(query)}.json"


def _load_cache(query: str) -> dict | None:
    path = _cache_path(query)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        retrieved = datetime.fromisoformat(payload["retrieved_at"])
        if retrieved.tzinfo is None:
            retrieved = retrieved.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - retrieved > timedelta(hours=CACHE_TTL_HOURS):
            logger.info("Tavily cache expired: %s", path.name)
            return None
        if payload.get("status") != "ok" or not isinstance(payload.get("results"), list):
            return None
        return payload
    except FileNotFoundError:
        return None
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("Ignoring unreadable Tavily cache %s (%s)", path.name, type(exc).__name__)
        return None


def _save_cache(query: str, payload: dict) -> None:
    """Write cache JSON atomically so interrupted writes do not corrupt entries."""
    path = _cache_path(query)
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=f"{path.stem}.", suffix=".tmp", dir=CACHE_DIR)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(payload, stream, ensure_ascii=False)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    except OSError as exc:
        logger.warning("Could not write Tavily cache (%s)", type(exc).__name__)


def _error_kind(exc: Exception) -> str:
    message = str(exc).casefold()
    if any(token in message for token in ("401", "403", "unauthorized", "authentication", "api key")):
        return "authentication"
    if any(token in message for token in ("429", "quota", "rate limit")):
        return "quota"
    if any(token in message for token in ("timeout", "timed out")):
        return "timeout"
    if any(token in message for token in ("connection", "network", "dns")):
        return "network"
    return "api_error"


def _format_payload(payload: dict, *, cached: bool = False) -> str:
    output = dict(payload)
    output["cached"] = cached
    return json.dumps(output, ensure_ascii=False)


def _deduplicate_results(results: list) -> list[dict]:
    distinct: list[dict] = []
    seen: set[str] = set()
    for result in results:
        if not isinstance(result, dict):
            continue
        url = str(result.get("url") or "").strip()
        if url:
            parts = urlsplit(url)
            url = urlunsplit((parts.scheme, parts.netloc.casefold(), parts.path.rstrip("/"), parts.query, ""))
            if url in seen:
                continue
            seen.add(url)
        content = str(result.get("content") or "").strip()
        distinct.append({
            "title": result.get("title") or "",
            "url": url or None,
            "content": content[:MAX_CONTENT_CHARS],
            "published_date": result.get("published_date") or result.get("published") or None,
            "score": result.get("score"),
        })
        if len(distinct) >= MAX_RESULTS:
            break
    return distinct


def reset_search_counter() -> None:
    """Reset live query allowance before a CrewAI pipeline run."""
    global _search_counter
    with _search_lock:
        _search_counter = 0


def _execute_tavily_search(query: str, *, enforce_limit: bool = True) -> str:
    """Return structured search evidence or an explicit classified failure.

    enforce_limit=False is for the one restaurant search per plan (agent/tools/restaurant_search.py):
    it runs in the backend process, where the CrewAI allowance counter is never reset.
    """
    global _search_counter
    query = query.strip()
    if not query:
        return json.dumps({"status": "error", "error_type": "invalid_query", "message": "Query is empty."})

    cached = _load_cache(query)
    if cached:
        logger.info("Tavily cache hit: %s", _cache_key(query))
        return _format_payload(cached, cached=True)
    logger.info("Tavily cache miss: %s", _cache_key(query))

    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key or api_key.startswith("tvly-your") or api_key.startswith("tvly_your"):
        return json.dumps({"status": "error", "error_type": "authentication", "message": "TAVILY_API_KEY is not configured."})

    with _search_lock:
        if enforce_limit and _search_counter >= MAX_SEARCH_QUERIES:
            logger.warning("Tavily live query allowance exhausted (%d)", MAX_SEARCH_QUERIES)
            return json.dumps({"status": "error", "error_type": "query_limit", "message": "Live search limit reached; use available evidence and mark unsupported claims unverified."})
        if enforce_limit:
            _search_counter += 1
        count = _search_counter

    depth = SEARCH_DEPTH if SEARCH_DEPTH in {"basic", "advanced", "fast", "ultra-fast"} else "basic"
    logger.info("Tavily API request %d/%d depth=%s", count, MAX_SEARCH_QUERIES, depth)
    try:
        if TavilyClient is not None:
            response = TavilyClient(api_key=api_key).search(
                query=query,
                max_results=MAX_RESULTS,
                search_depth=depth,
                timeout=float(os.getenv("TAVILY_TIMEOUT_S", "12")),
            )
        else:
            import requests
            timeout = float(os.getenv("TAVILY_TIMEOUT_S", "12"))
            resp = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "max_results": MAX_RESULTS,
                    "search_depth": depth,
                },
                timeout=timeout,
            )
            resp.raise_for_status()
            response = resp.json()
        results = _deduplicate_results(response.get("results") or [])
        payload = {
            "status": "ok" if results else "no_results",
            "query": query,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
        if results:
            _save_cache(query, payload)
        return _format_payload(payload)
    except Exception as exc:
        error_type = _error_kind(exc)
        logger.error("Tavily %s failure (%s)", error_type, type(exc).__name__)
        return json.dumps({
            "status": "error",
            "error_type": error_type,
            "message": "Live search failed; use only prior evidence and mark unsupported claims unverified.",
        })


def execute_tavily_search(query: str, *, enforce_limit: bool = True) -> str:
    """Serialize search requests so concurrent identical misses do not duplicate API calls."""
    with _query_lock:
        return _execute_tavily_search(query, enforce_limit=enforce_limit)


@tool("Search for real places and activities")
def search_destination(query: str) -> str:
    """Search the web and return structured place evidence with source URLs."""
    return execute_tavily_search(query)
