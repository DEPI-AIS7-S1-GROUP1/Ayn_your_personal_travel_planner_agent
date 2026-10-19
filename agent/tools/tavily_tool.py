"""Tavily Search tool for CrewAI agents.

Wraps the Tavily Python SDK as a CrewAI @tool so Agent 2 can call it.
Keeps results concise to minimise token usage.
"""

import hashlib
import logging
import os
from pathlib import Path
from crewai.tools import tool
from tavily import TavilyClient

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "tavily"

MAX_SEARCH_QUERIES = 2
_search_counter = 0


def _cache_key(query: str) -> str:
    """Compute a stable hash key for a query."""
    return hashlib.md5(query.lower().strip().encode("utf-8")).hexdigest()[:12]


def _load_cache(query: str) -> str | None:
    """Load cached search result if available."""
    path = CACHE_DIR / f"{_cache_key(query)}.txt"
    if path.exists():
        try:
            return path.read_text(encoding="utf-8")
        except Exception:
            return None
    return None


def _save_cache(query: str, result: str) -> None:
    """Persist search result to local cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        (CACHE_DIR / f"{_cache_key(query)}.txt").write_text(result, encoding="utf-8")
    except Exception as exc:
        logger.debug("Failed to write Tavily cache: %s", exc)


def reset_search_counter() -> None:
    """Reset the search query counter before a new pipeline run."""
    global _search_counter
    _search_counter = 0


def execute_tavily_search(query: str) -> str:
    """Core logic to search destination with caching."""
    global _search_counter

    # Check cache first (saves Tavily free quota and prevents timeouts)
    cached = _load_cache(query)
    if cached:
        logger.info("Tavily cache hit for query: %s", query[:60])
        return cached

    if _search_counter >= MAX_SEARCH_QUERIES:
        logger.info("Search query cap reached (%d queries). Forcing synthesis.", MAX_SEARCH_QUERIES)
        return (
            "Search query limit reached (maximum 2-3 queries executed). "
            "Do NOT perform any more searches. Immediately construct and output "
            "your final verified_places JSON using the results already obtained."
        )

    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or api_key.startswith("tvly-your"):
        logger.warning("TAVILY_API_KEY not set — returning empty results")
        return "No results (API key not configured)."

    _search_counter += 1
    logger.info("Executing Tavily search %d/%d for: %s", _search_counter, MAX_SEARCH_QUERIES, query)

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            max_results=3,
            search_depth="basic",
        )
    except Exception as exc:
        logger.error("Tavily search failed: %s", exc)
        return f"Search error: {exc}"

    results = []
    for r in response.get("results", []):
        # Truncate content to 120 chars to keep context lean and prevent rate limits
        snippet = r.get("content", "")[:120].strip()
        results.append(f"- {r.get('title', 'Untitled')}: {snippet}")

    if not results:
        res_text = "No results found for this query."
    else:
        res_text = "\n".join(results)

    _save_cache(query, res_text)
    return res_text


@tool("Search for real places and activities")
def search_destination(query: str) -> str:
    """Search the web for real restaurants, activities, hotels, and transport
    options at a travel destination.

    Returns a concise list of verified place names with short descriptions
    and approximate costs.
    """
    return execute_tavily_search(query)
