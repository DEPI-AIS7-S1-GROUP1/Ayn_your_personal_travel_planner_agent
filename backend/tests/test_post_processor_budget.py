"""The agent's validator keeps each category within its budget (contract §3.5).

Reproduces a real Luxor plan (USD 1000, 2 travelers) where food was 320 of 250 and
activities 310 of 300 after generation.
"""

from agent.main import generate_plan_from_dict
from agent.schemas import FinalPlanResponse
from agent.validators.post_processor import post_process

PROFILE = {"personality": ["history-loving"], "hobbies": ["museums"], "food_likes": ["koshari"],
           "food_dislikes": [], "dietary_limits": ["halal"]}
TRIP = {"destination": {"city": "Luxor", "country": "Egypt"}, "start_date": "2026-11-10",
        "end_date": "2026-11-15", "total_budget": 1000, "currency": "USD", "travelers": 2}
SPLIT = {"hotel": 300, "food": 250, "activities": 300, "transport": 150}


def plan_with_costs(costs_by_category):
    """A real plan shape, with the activity costs replaced by the given values."""
    data = generate_plan_from_dict(PROFILE, TRIP, force_tier=3).model_dump(by_alias=True)
    data["budget_split"] = dict(SPLIT)
    activities = [a for day in data["itinerary"] for a in day["activities"]]
    for category, costs in costs_by_category.items():
        targets = [a for a in activities if a["category"] == category]
        for act, cost in zip(targets, costs):
            act["estimated_cost"] = cost
        for act in targets[len(costs):]:
            act["estimated_cost"] = 0
    return FinalPlanResponse.model_validate(data)


def totals(plan):
    out = {}
    for day in plan.itinerary:
        for a in day.activities:
            out[a.category] = out.get(a.category, 0) + a.estimated_cost
    return out


def test_over_budget_categories_are_scaled_down():
    plan = plan_with_costs({"food": [40, 20, 30, 20, 30, 20, 30, 20, 30, 20, 30, 30],  # 320
                            "activities": [60, 40, 80, 40, 50, 40]})                   # 310
    assert totals(plan)["food"] > SPLIT["food"]  # the bug as generated

    fixed = totals(post_process(plan))
    for category, cap in SPLIT.items():
        assert fixed.get(category, 0) <= cap, (category, fixed, SPLIT)


def test_categories_within_budget_are_not_touched():
    plan = plan_with_costs({"food": [40, 30], "activities": [60, 50]})
    before = [(a.id, a.estimated_cost) for d in plan.itinerary for a in d.activities]
    after = [(a.id, a.estimated_cost) for d in post_process(plan).itinerary for a in d.activities]
    assert before == after
