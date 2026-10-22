"""Plans router (contract §4: GET/PUT/Confirm/Cancel /plans/{id} and POST /plans/{id}/chat)."""

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import ChatMessage, Conversation, Plan, Trip, User, utcnow
from app.plan_rules import PlanRuleError, check_budget_split, check_itinerary, check_trip_dates
from agent.agents.chat_agent import chat as agent_chat

router = APIRouter(tags=["plans"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1, max_length=1000)


class UpdatePlanRequest(BaseModel):
    itinerary: list[dict] | None = None
    budget_split: dict[str, int] | None = None
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

    trip = plan.trip
    try:
        budget_split = plan.budget_split
        if payload.budget_split is not None:
            budget_split = check_budget_split(payload.budget_split, trip.total_budget)
        # A new split is checked against the itinerary that stays, too: lowering a category
        # below what its activities already cost would break contract §3.5.
        itinerary = payload.itinerary if payload.itinerary is not None else plan.itinerary
        itinerary = check_itinerary(itinerary, trip.start_date, trip.end_date, budget_split)
    except PlanRuleError as exc:
        raise ApiError(400, "VALIDATION_ERROR", str(exc))

    plan.budget_split = budget_split
    if payload.itinerary is not None:
        plan.itinerary = itinerary

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
    2. Load the conversation (if any) and build the history in memory.
    3. Call the agent with no write open: a reply can take many seconds, and an open
       write would lock SQLite for every other user meanwhile (same fix as POST /trips).
    4. If updated, check the new trip and plan with the same rules as PUT /plans.
    5. Save the conversation, both messages and the plan in one short transaction.
    """
    # Step 1: Check login and plan owner
    plan = db.get(Plan, plan_id)
    if plan is None or plan.trip.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", f"Plan '{plan_id}' not found.")

    # Reject non-draft plans with 409
    if plan.status != "draft":
        raise ApiError(409, "PLAN_NOT_EDITABLE", "Only draft plans can be edited.")

    # Step 2: Load the conversation. Only this plan's conversations can be continued;
    # the server picks the id of a new one.
    conversation = None
    if payload.conversation_id:
        conversation = db.execute(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.plan_id == plan.id,
            )
        ).scalar_one_or_none()
        if conversation is None:
            raise ApiError(404, "NOT_FOUND", f"Conversation '{payload.conversation_id}' not found.")

    history = [
        {"role": m.role, "content": m.content, "action": m.action, "changes": m.changes}
        for m in (conversation.messages if conversation else [])
    ]
    history.append({"role": "user", "content": payload.message, "action": None, "changes": None})

    plan_dict = serialize_plan(plan)
    trip_dict = serialize_trip(plan.trip)
    profile_dict = serialize_profile(user)
    search_context = plan.search_context
    conversation_id = conversation.id if conversation else None

    # Step 3: Call the agent with no transaction open
    db.rollback()
    try:
        agent_resp = agent_chat(
            plan=plan_dict,
            trip=trip_dict,
            profile=profile_dict,
            history=history,
            message=payload.message,
            search_context=search_context,
        )
    except Exception:
        logger.exception("Chat agent failed for plan %s", plan_id)
        raise ApiError(502, "GENERATION_FAILED", "The assistant could not answer. Please try again.")

    action = agent_resp.get("action")
    if action not in ("updated", "needs_clarification"):
        action = "needs_clarification"
    assistant_content = agent_resp.get("message") or ""
    changes = (agent_resp.get("changes") or []) if action == "updated" else []

    # The plan may have changed while the agent was working (e.g. confirmed in another tab).
    plan = db.get(Plan, plan_id)
    if plan is None or plan.status != "draft":
        raise ApiError(409, "PLAN_NOT_EDITABLE", "Only draft plans can be edited.")
    trip = plan.trip

    # Step 4: If updated, check the new trip and plan like PUT /plans does
    if action == "updated":
        updated_p = agent_resp.get("plan")
        updated_t = agent_resp.get("trip") or {}
        if not isinstance(updated_p, dict):
            raise ApiError(502, "GENERATION_FAILED", "The assistant returned an update without a plan.")
        try:
            total_budget = updated_t.get("total_budget", trip.total_budget)
            if isinstance(total_budget, bool) or not isinstance(total_budget, int) or total_budget <= 0:
                raise PlanRuleError("total_budget must be a positive integer.")
            start = date.fromisoformat(updated_t.get("start_date", trip.start_date.isoformat()))
            end = date.fromisoformat(updated_t.get("end_date", trip.end_date.isoformat()))
            # "Not in the past" only applies when the agent moves the start date.
            check_trip_dates(start, end, today=date.today() if start != trip.start_date else None)
            budget_split = check_budget_split(updated_p.get("budget_split"), total_budget)
            itinerary = check_itinerary(updated_p.get("itinerary"), start, end, budget_split)
        except (PlanRuleError, ValueError, TypeError) as exc:
            logger.warning("Chat agent produced an invalid plan for %s: %s", plan_id, exc)
            raise ApiError(502, "GENERATION_FAILED", "The assistant produced an invalid plan. Please rephrase and try again.")

        trip.total_budget = total_budget
        trip.start_date = start
        trip.end_date = end
        plan.budget_split = budget_split
        plan.itinerary = itinerary
        options = updated_p.get("options")
        if isinstance(options, dict) and isinstance(options.get("flights"), list) and isinstance(options.get("hotels"), list):
            plan.options = options
        plan.updated_at = utcnow()

    # Step 5: Save everything in one short transaction
    if conversation_id is None:
        conversation = Conversation(plan_id=plan.id)
        db.add(conversation)
        db.flush()
        conversation_id = conversation.id
    db.add(ChatMessage(conversation_id=conversation_id, role="user", content=payload.message))
    assistant_msg = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content,
        action=action,
        changes=changes if action == "updated" else None,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "conversation_id": conversation_id,
        "message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": assistant_msg.content,
            "created_at": assistant_msg.created_at.strftime("%Y-%m-%dT%H:%M"),
        },
        "action": action,
        "changes": changes,
        "trip": serialize_trip(trip) if action == "updated" else None,
        "plan": serialize_plan(plan) if action == "updated" else None,
    }
