"""Agent 1 — Context & Constraint Parser.

Reads the user profile and trip request, extracts personality traits,
hard constraints (food dislikes, dietary limits, disliked experiences),
and produces 2-3 targeted search queries for the destination.
"""

from crewai import Agent
from agent.llm_config import get_groq_llm


def create_context_agent() -> Agent:
    return Agent(
        role="Travel Profile Analyst",
        goal=(
            "Extract user preferences, strict dietary/activity constraints, "
            "and generate exactly 2-3 highly targeted search queries for the "
            "destination. Be concise — output only structured JSON."
        ),
        backstory=(
            "You are an expert travel concierge who reads traveler profiles "
            "and understands what they love and hate. You never recommend "
            "things the user explicitly dislikes. You are efficient and "
            "produce minimal, structured output."
        ),
        llm=get_groq_llm(temperature=0.2),
        verbose=True,
        allow_delegation=False,
    )
