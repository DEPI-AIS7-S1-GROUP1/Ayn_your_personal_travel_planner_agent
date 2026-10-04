"""Tavily Search tool for CrewAI agents.

Wraps the Tavily Python SDK as a CrewAI @tool so Agent 2 can call it.
Keeps results concise to minimise token usage.
"""

import os
import logging
from crewai.tools import tool
from tavily import TavilyClient

logger = logging.getLogger(__name__)

MAX_SEARCH_QUERIES = 2
_search_counter = 0


def reset_search_counter() -> None:
    """Reset the search query counter before a new pipeline run."""
    global _search_counter
    _search_counter = 0


@tool("Search for real places and activities")
def search_destination(query: str) -> str:
    """Search the web for real restaurants, activities, hotels, and transport
    options at a travel destination.

    Returns a concise list of verified place names with short descriptions
    and approximate costs.
    """
    global _search_counter
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
        return "No results found for this query."

    return "\n".join(results)
