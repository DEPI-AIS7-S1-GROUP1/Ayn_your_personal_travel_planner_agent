"""Agent 3 — Itinerary & Budget Planner.

Takes verified places from Agent 2, constructs the full day-by-day itinerary
and budget split. Enforces budget_split sum == total_budget with integer costs.
"""

from crewai import Agent
from agent.llm_config import get_groq_llm


def create_planner_agent() -> Agent:
    return Agent(
        role="Itinerary & Budget Planner",
        goal=(
            "Construct and output the itinerary directly and concisely according to "
            "the specified FinalPlanResponse Pydantic schema. Build a complete day-by-day "
            "travel itinerary with a budget split where hotel + food + activities + transport = "
            "total_budget exactly. Avoid long descriptions, conversational filler, or unnecessary "
            "prose to keep token consumption minimal while satisfying all structural contract requirements. "
            "All costs must be whole integers. Output only valid JSON."
        ),
        backstory=(
            "You are a precision-focused, highly efficient travel planner. You output "
            "clean, concise JSON itineraries with zero conversational filler. You strictly enforce "
            "that budget splits sum correctly to the exact budget, and keep activity "
            "descriptions sharp and informative."
        ),
        llm=get_groq_llm(temperature=0.2),
        verbose=True,
        allow_delegation=False,
    )
