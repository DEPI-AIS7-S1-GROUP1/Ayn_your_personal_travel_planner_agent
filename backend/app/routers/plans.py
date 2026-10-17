"""Plans router (contract §4: GET/PUT/Confirm/Cancel /plans/{id} and POST /plans/{id}/chat)."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import ChatMessage, Conversation, Plan, Trip, User, utcnow
from agent.agents.chat_agent import chat as agent_chat

router = APIRouter(tags=["plans"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1, max_length=1000)


class UpdatePlanRequest(BaseModel):
    itinerary: list[dict] | None = None
    budget_split: dict | None = None
    selected_flight_id: str | None = None
    selected_hotel_id: str | None = None


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def serialize_plan(plan: Plan) -> dict[str, Any]:
    trip = plan.trip
    return {
        "id": plan.id,
        "trip_id": plan.trip_id,
        "status": plan.status,
        "destination": {
            "city": trip.destination_city,
            "country": trip.destination_country,
        },
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "travelers": trip.travelers,
        "total_budget": trip.total_budget,
        "currency": trip.currency,
        "budget_split": plan.budget_split,
        "itinerary": plan.itinerary,
        "options": plan.options,
        "selected_flight_id": plan.selected_flight_id,
        "selected_hotel_id": plan.selected_hotel_id,
        "search_context": plan.search_context,
        "created_at": plan.created_at.date().isoformat(),
        "updated_at": plan.updated_at.date().isoformat(),
    }


def serialize_trip(trip: Trip) -> dict[str, Any]:
    return {
        "id": trip.id,
        "destination": {
            "city": trip.destination_city,
            "country": trip.destination_country,
        },
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "total_budget": trip.total_budget,
        "currency": trip.currency,
        "travelers": trip.travelers,
    }


def serialize_profile(user: User) -> dict[str, Any]:
    prof = user.profile
    if not prof:
        return {}
    return {
        "personality": prof.personality,
        "hobbies": prof.hobbies,
        "food_likes": prof.food_likes,
        "food_dislikes": prof.food_dislikes,
        "dietary_limits": prof.dietary_limits,
        "liked_last_trip": prof.liked_last_trip,
        "disliked_last_trip": prof.disliked_last_trip,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/plans/{plan_id}")
def get_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Read one plan. User can only read their own plan (contract §1, §4)."""
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")
    return serialize_plan(plan)


@router.put("/plans/{plan_id}")
def update_plan(
    plan_id: str,
    payload: UpdatePlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save manual edits to a draft plan (contract §4 PUT /plans/{id})."""
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")

    if plan.status != "draft":
        raise ApiError(409, "PLAN_NOT_EDITABLE", "Only draft plans can be edited.")

    active_bs = plan.budget_split
    if payload.budget_split is not None:
        # Validate budget split sum
        bs = payload.budget_split
        total = plan.trip.total_budget
        if sum(bs.values()) != total:
            raise ApiError(
                400,
                "VALIDATION_ERROR",
                f"budget_split must sum to total_budget ({total}). Got {sum(bs.values())}.",
            )
        active_bs = bs
        plan.budget_split = bs

    if payload.itinerary is not None:
        # Validate itinerary continuity and structure (contract §3.5, §3.6, §4)
        trip = plan.trip
        num_days = (trip.end_date - trip.start_date).days + 1
        if len(payload.itinerary) != num_days:
            raise ApiError(
                400,
                "VALIDATION_ERROR",
                f"Itinerary must contain exactly {num_days} days covering {trip.start_date} to {trip.end_date}.",
            )

        valid_time_slots = {"morning", "afternoon", "evening"}
        valid_categories = {"hotel", "food", "activities", "transport"}
        category_costs = {"hotel": 0, "food": 0, "activities": 0, "transport": 0}

        cleaned_itinerary = []
        for i, day in enumerate(payload.itinerary):
            expected_day_num = i + 1
            expected_date = (trip.start_date + timedelta(days=i)).isoformat()

            day_num = day.get("day")
            day_date = day.get("date")

            if day_num != expected_day_num:
                raise ApiError(
                    400,
                    "VALIDATION_ERROR",
                    f"Day index mismatch at position {i}: expected day {expected_day_num}, got {day_num}.",
                )
            if day_date != expected_date:
                raise ApiError(
                    400,
                    "VALIDATION_ERROR",
                    f"Day {day_num} date gap or mismatch: expected {expected_date}, got {day_date}.",
                )

            activities = day.get("activities", [])
            if not isinstance(activities, list) or len(activities) < 1:
                raise ApiError(
                    400,
                    "VALIDATION_ERROR",
                    f"Day {day_num} must contain at least 1 activity.",
                )

            cleaned_activities = []
            for j, act in enumerate(activities):
                if not isinstance(act, dict):
                    raise ApiError(400, "VALIDATION_ERROR", f"Invalid activity format on day {day_num}.")

                time_slot = act.get("time_slot")
                if time_slot not in valid_time_slots:
                    raise ApiError(
                        400,
                        "VALIDATION_ERROR",
                        f"Day {day_num} activity '{act.get('title', '')}' has invalid time_slot '{time_slot}'. Must be morning, afternoon, or evening.",
                    )

                category = act.get("category")
                if category not in valid_categories:
                    raise ApiError(
                        400,
                        "VALIDATION_ERROR",
                        f"Day {day_num} activity '{act.get('title', '')}' has invalid category '{category}'. Must be hotel, food, activities, or transport.",
                    )

                cost = act.get("estimated_cost", 0)
                if not isinstance(cost, int) or cost < 0:
                    raise ApiError(
                        400,
                        "VALIDATION_ERROR",
                        f"Day {day_num} activity '{act.get('title', '')}' estimated_cost must be a non-negative integer.",
                    )

                category_costs[category] += cost

                act_id = act.get("id") or f"act_{day_num}_{j+1}"
                cleaned_activities.append({
                    "id": act_id,
                    "title": act.get("title", ""),
                    "description": act.get("description", ""),
                    "time_slot": time_slot,
                    "estimated_cost": cost,
                    "category": category,
                })

            cleaned_itinerary.append({
                "day": day_num,
                "date": day_date,
                "activities": cleaned_activities,
            })

        # Check category budget sums
        for cat, cost_sum in category_costs.items():
            allocated = active_bs.get(cat, 0)
            if cost_sum > allocated:
                raise ApiError(
                    400,
                    "VALIDATION_ERROR",
                    f"Total estimated cost for category '{cat}' ({cost_sum}) exceeds allocated budget ({allocated}).",
                )

        plan.itinerary = cleaned_itinerary

    if payload.selected_flight_id is not None:
        plan.selected_flight_id = payload.selected_flight_id

    if payload.selected_hotel_id is not None:
        plan.selected_hotel_id = payload.selected_hotel_id

    plan.updated_at = utcnow()
    db.commit()
    return serialize_plan(plan)


@router.post("/plans/{plan_id}/confirm")
def confirm_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm a draft plan (contract §4 POST /plans/{id}/confirm)."""
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")

    if plan.status != "draft":
        raise ApiError(409, "INVALID_STATUS_TRANSITION", f"Cannot confirm a plan with status '{plan.status}'.")

    plan.status = "confirmed"
    plan.updated_at = utcnow()
    db.commit()
    return serialize_plan(plan)


@router.post("/plans/{plan_id}/cancel")
def cancel_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a draft or confirmed plan (contract §4 POST /plans/{id}/cancel)."""
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")

    if plan.status == "cancelled":
        raise ApiError(409, "INVALID_STATUS_TRANSITION", "Plan is already cancelled.")

    plan.status = "cancelled"
    plan.updated_at = utcnow()
    db.commit()
    return serialize_plan(plan)


@router.post("/plans/{plan_id}/chat")
def chat_plan(
    plan_id: str,
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refine a draft plan via chat (contract §4.75).
    
    Steps:
    1. Check login and plan owner. Reject non-draft plans with 409.
    2. Create or load the conversation. Save the user's message.
    3. Call the agent.
    4. If updated, check that budget sums and dates are valid, then save plan.
    5. Save the assistant message and return response.
    """
    # Step 1: Check login and plan owner
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")

    # Reject non-draft plans with 409
    if plan.status != "draft":
        raise ApiError(409, "PLAN_NOT_EDITABLE", "Only draft plans can be edited.")

    # Step 2: Create or load conversation
    conv_id = payload.conversation_id
    conversation = None
    if conv_id:
        conversation = db.execute(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.plan_id == plan.id,
            )
        ).scalar_one_or_none()
        if conversation is None:
            conversation = Conversation(id=conv_id, plan_id=plan.id)
            db.add(conversation)
            db.flush()

    if conversation is None:
        conversation = Conversation(plan_id=plan.id)
        db.add(conversation)
        db.flush()

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    db.flush()

    # Build conversation history
    history = [
        {
            "role": m.role,
            "content": m.content,
            "action": m.action,
            "changes": m.changes,
        }
        for m in conversation.messages
    ]

    # Step 3: Call the agent
    plan_dict = serialize_plan(plan)
    trip_dict = serialize_trip(plan.trip)
    profile_dict = serialize_profile(user)
    search_context = plan.search_context

    try:
        agent_resp = agent_chat(
            plan=plan_dict,
            trip=trip_dict,
            profile=profile_dict,
            history=history,
            message=payload.message,
            search_context=search_context,
        )
    except Exception as exc:
        raise ApiError(502, "GENERATION_FAILED", f"Agent failed: {exc}")

    action = agent_resp.get("action", "needs_clarification")
    assistant_content = agent_resp.get("message", "")
    changes = agent_resp.get("changes") or []

    updated_trip_data = None
    updated_plan_data = None

    # Step 4: If updated, check budget sums and dates, then save plan
    if action == "updated":
        updated_p = agent_resp.get("plan")
        updated_t = agent_resp.get("trip")
        if not updated_p:
            raise ApiError(502, "GENERATION_FAILED", "Agent returned updated action without plan data.")

        # Check budget split sum
        bs = updated_p.get("budget_split", {})
        total_budget = updated_p.get("total_budget", plan.trip.total_budget)
        if sum(bs.values()) != total_budget:
            raise ApiError(
                502,
                "GENERATION_FAILED",
                f"Agent produced invalid budget sum: {sum(bs.values())} != {total_budget}",
            )

        # Check dates
        s_date_str = updated_t.get("start_date") if updated_t else plan.trip.start_date.isoformat()
        e_date_str = updated_t.get("end_date") if updated_t else plan.trip.end_date.isoformat()
        try:
            s_date = date.fromisoformat(s_date_str)
            e_date = date.fromisoformat(e_date_str)
            if s_date > e_date or (e_date - s_date).days > 14:
                raise ValueError("Trip length invalid")
        except Exception:
            raise ApiError(502, "GENERATION_FAILED", "Agent produced invalid trip dates.")

        # Apply changes to DB models
        plan.itinerary = updated_p.get("itinerary", plan.itinerary)
        plan.budget_split = updated_p.get("budget_split", plan.budget_split)
        if "options" in updated_p:
            plan.options = updated_p["options"]

        if updated_t:
            if "total_budget" in updated_t:
                plan.trip.total_budget = updated_t["total_budget"]
            if "start_date" in updated_t:
                plan.trip.start_date = date.fromisoformat(updated_t["start_date"])
            if "end_date" in updated_t:
                plan.trip.end_date = date.fromisoformat(updated_t["end_date"])

        plan.updated_at = utcnow()
        db.flush()

        updated_trip_data = serialize_trip(plan.trip)
        updated_plan_data = serialize_plan(plan)

    # Step 5: Save assistant message and return response
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
        action=action,
        changes=changes if action == "updated" else None,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "conversation_id": conversation.id,
        "message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": assistant_msg.content,
            "created_at": assistant_msg.created_at.strftime("%Y-%m-%dT%H:%M"),
        },
        "action": action,
        "changes": changes,
        "trip": updated_trip_data,
        "plan": updated_plan_data,
    }

