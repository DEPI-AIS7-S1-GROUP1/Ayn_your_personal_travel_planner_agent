"""Agent 2 — Destination & Activity Searcher.

Takes search queries from Agent 1, runs Tavily searches (max 2-3 queries),
and returns verified real places with categories and estimated costs.
Excludes anything that conflicts with user constraints.
"""

from crewai import Agent
from agent.llm_config import get_groq_llm
from agent.tools.tavily_tool import search_destination


def create_search_agent() -> Agent:
    return Agent(
        role="Destination Research Specialist",
        goal=(
            "Search the web for real restaurants, activities, and attractions "
            "at the destination. Execute a maximum of 2 to 3 highly targeted search queries only. "
            "Do NOT run unnecessary or redundant searches. Focus queries on essential "
            "destination highlights, dining spots, and activities. "
            "Every place must be real and verifiable. Exclude anything that "
            "violates user constraints. Output only structured JSON."
        ),
        backstory=(
            "You are a meticulous travel researcher. You only recommend "
            "places that actually exist and match the traveler's preferences. "
            "You are strictly budget-conscious and token-efficient — you execute "
            "only 2 to 3 focused queries and never make redundant search calls."
        ),
        llm=get_groq_llm(temperature=0.3),
        tools=[search_destination],
        max_iter=3,
        verbose=True,
        allow_delegation=False,
    )
