"""Task for Agent 1 — Context & Constraint Parsing."""

import json
from crewai import Task, Agent
from agent.schemas import Agent1Output


def create_context_task(agent: Agent, profile: dict, trip: dict) -> Task:
    """Build the task that parses user profile + trip into structured context."""
    destination = trip["destination"]["city"]

    return Task(
        description=(
            f"Analyze this traveler's profile and trip request.\n\n"
            f"PROFILE:\n{json.dumps(profile, indent=2)}\n\n"
            f"TRIP REQUEST:\n{json.dumps(trip, indent=2)}\n\n"
            f"Extract the following:\n"
            f"1. user_traits: List of personality traits and preference keywords\n"
            f"2. strict_constraints: Things to AVOID (food dislikes, dietary "
            f"limits, disliked experiences)\n"
            f"3. search_queries: Exactly 2-3 targeted web search queries to "
            f"find real places at {destination}. Queries should cover dining, "
            f"activities, and sightseeing.\n\n"
            f"Output ONLY valid JSON. No commentary or explanation.\n"
            f"Schema:\n{json.dumps(Agent1Output.model_json_schema(), indent=2)}"
        ),
        expected_output=(
            "A JSON object with keys: user_traits (list of strings), "
            "strict_constraints (list of strings), search_queries (list of "
            "2-3 strings)"
        ),
        agent=agent,
    )
