"""Task for Agent 3 — Itinerary & Budget Planning."""

import json
from datetime import date
from crewai import Task, Agent
from agent.schemas import FinalPlanResponse


def create_planner_task(
    agent: Agent,
    search_task: Task,
    profile: dict,
    trip: dict,
) -> Task:
    """Build the task that constructs the full plan from verified places."""
    start = date.fromisoformat(trip["start_date"])
    end = date.fromisoformat(trip["end_date"])
    num_days = (end - start).days + 1
    budget = trip["total_budget"]
    currency = trip.get("currency", "EGP")
    destination = trip["destination"]
    travelers = trip["travelers"]

    # Determine activity density from personality
    personalities = profile.get("personality", [])
    if "calm" in personalities:
        density_hint = "2-3 activities per day (calm profile)"
    elif "adventurous" in personalities:
        density_hint = "4-5 activities per day (adventurous profile)"
    else:
        density_hint = "3-4 activities per day"

    return Task(
        description=(
            f"Build a complete {num_days}-day travel plan using the verified "
            f"places from the previous step.\n\n"
            f"TRIP DETAILS:\n"
            f"- Destination: {destination['city']}, {destination['country']}\n"
            f"- Dates: {trip['start_date']} to {trip['end_date']} ({num_days} days)\n"
            f"- Travelers: {travelers}\n"
            f"- Total budget: {budget} {currency}\n"
            f"- Activity density: {density_hint}\n\n"
            f"CRITICAL RULES:\n"
            f"1. EFFICIENT PLAN GENERATION:\n"
            f"   - Construct and output the itinerary directly and concisely according to the specified Pydantic schema.\n"
            f"   - Avoid long descriptions, conversational filler, or unnecessary prose to keep token consumption minimal while satisfying all structural contract requirements.\n"
            f"   - Keep each activity description to 1 concise sentence.\n"
            f"2. budget_split: hotel + food + activities + transport MUST = "
            f"{budget} exactly\n"
            f"3. All estimated_cost values must be integers (no decimals)\n"
            f"4. Hotel check-in/check-out activities have estimated_cost = 0\n"
            f"5. time_slot: morning, afternoon, or evening\n"
            f"6. category: hotel, food, activities, or transport\n"
            f"7. Dates must cover {trip['start_date']} to {trip['end_date']} "
            f"with no gaps\n"
            f"8. Include 2 flight options and 2-3 hotel options in 'options'\n"
            f"9. Use id format: act_001, act_002, ... for activities\n"
            f"10. Use id format: flt_001, flt_002 for flights\n"
            f"11. Use id format: htl_001, htl_002 for hotels\n"
            f"12. All prices are total for the whole group, not per person\n"
            f"13. Avoid: {profile.get('food_dislikes', [])} and respect "
            f"dietary limits: {profile.get('dietary_limits', [])}\n\n"
            f"Output ONLY valid JSON matching this schema (no conversational filler, no prose):\n"
            f"{json.dumps(FinalPlanResponse.model_json_schema(), indent=2)}"
        ),
        expected_output=(
            f"A complete JSON travel plan with destination, dates, travelers, "
            f"budget_split summing to {budget}, itinerary with {num_days} days, "
            f"and flight/hotel options"
        ),
        agent=agent,
        context=[search_task],
    )
