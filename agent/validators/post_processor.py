"""Post-processor — auto-repairs common LLM output issues.

Runs on EVERY plan output regardless of which tier produced it.
Fixes budget rounding, ensures integer costs, assigns missing IDs,
and validates the final result against FinalPlanResponse.
"""

import logging
from agent.schemas import FinalPlanResponse

logger = logging.getLogger(__name__)


def post_process(plan: FinalPlanResponse) -> FinalPlanResponse:
    """Auto-repair and validate a plan. Returns the cleaned plan.

    Repairs applied:
      1. Budget sum rounding — adjusts the largest category
      2. Float-to-int coercion on estimated_cost
      3. Missing activity IDs — assigns act_NNN
      4. Final Pydantic re-validation (raises on unfixable issues)
    """
    data = plan.model_dump(by_alias=True)

    # --- 1. Fix budget sum ---
    bs = data["budget_split"]
    current_sum = bs["hotel"] + bs["food"] + bs["activities"] + bs["transport"]
    total = data["total_budget"]

    if current_sum != total:
        diff = total - current_sum
        # Adjust the largest bucket to absorb the difference
        largest_key = max(
            ["hotel", "food", "activities", "transport"],
            key=lambda k: bs[k],
        )
        bs[largest_key] += diff
        logger.warning(
            "Auto-repaired budget: adjusted %s by %+d (%d → %d)",
            largest_key, diff, current_sum, total,
        )

    # --- 2. Ensure all costs are integers ---
    for day in data["itinerary"]:
        for act in day["activities"]:
            if not isinstance(act["estimated_cost"], int):
                old = act["estimated_cost"]
                act["estimated_cost"] = int(round(old))
                logger.warning(
                    "Coerced cost for '%s': %s → %d",
                    act["title"], old, act["estimated_cost"],
                )

    # --- 3. Assign missing activity IDs ---
    id_counter = 1
    existing_ids = set()
    for day in data["itinerary"]:
        for act in day["activities"]:
            if act.get("id"):
                existing_ids.add(act["id"])

    for day in data["itinerary"]:
        for act in day["activities"]:
            if not act.get("id"):
                while f"act_{id_counter:03d}" in existing_ids:
                    id_counter += 1
                act["id"] = f"act_{id_counter:03d}"
                existing_ids.add(act["id"])
                id_counter += 1

    # --- 4. Final validation (raises on unfixable issues) ---
    repaired_plan = FinalPlanResponse.model_validate(data)
    logger.info("Post-processing complete — plan is valid")
    return repaired_plan
