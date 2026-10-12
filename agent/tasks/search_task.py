"""Task for Agent 2 — Destination & Activity Search."""

import json
from crewai import Task, Agent
from agent.schemas import Agent2Output


def create_search_task(
    agent: Agent,
    context_task: Task,
    trip: dict,
) -> Task:
    """Build the task that searches for real places using Tavily."""
    destination = trip["destination"]["city"]
    currency = trip.get("currency", "EGP")

    return Task(
        description=(
            f"Using the search queries from the previous analysis, find REAL "
            f"places at {destination}.\n\n"
            f"TOKEN & RESOURCE OPTIMIZATION RULES:\n"
            f"- Execute a MAXIMUM of 2 to 3 highly targeted search queries only.\n"
            f"- Do NOT run unnecessary or redundant searches.\n"
            f"- Focus queries on essential destination highlights, dining spots, and activities.\n\n"
            f"CONTENT & ACCURACY RULES:\n"
            f"- Every place must be real and verifiable.\n"
            f"- Exclude any place that conflicts with the user's "
            f"strict_constraints from the previous step.\n"
            f"- For each place provide:\n"
            f"  * name: Real place name\n"
            f"  * category: one of hotel, food, activities, transport\n"
            f"  * description: 1 concise sentence\n"
            f"  * estimated_cost: approximate cost in {currency} (integer)\n\n"
            f"Output ONLY valid JSON. No commentary or conversational filler.\n"
            f"Schema:\n{json.dumps(Agent2Output.model_json_schema(), indent=2)}"
        ),
        expected_output=(
            "A JSON object with key: verified_places (list of objects with "
            "name, category, description, estimated_cost)"
        ),
        agent=agent,
        context=[context_task],
    )
