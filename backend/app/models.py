"""Database tables, based on docs/api-contract.md (Task 1).

    users         1 ── 0..1 profiles
    users         1 ── *    trips
    trips         1 ── 1    plans
    plans         1 ── 0..1 ratings
    plans         1 ── *    conversations   (chat refine panel)
    conversations 1 ── 1..* chat_messages

Rules that only need one column (unique, ranges, allowed status) are enforced
here as constraints. Rules that need logic or look inside JSON (enum values in
lists, budget split sum, 14-day limit, status transitions) belong to the API
layer.

JSON columns: assign a new value (plan.itinerary = new_list) instead of
mutating in place, otherwise SQLAlchemy does not notice the change.
"""

import secrets
from datetime import date, datetime, timezone

from sqlalchemy import JSON, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

PLAN_STATUSES = ("draft", "confirmed", "cancelled")
CHAT_ROLES = ("user", "assistant")
CHAT_ACTIONS = ("updated", "needs_clarification")


def _sql_in(values: tuple[str, ...]) -> str:
    return "(" + ", ".join(f"'{v}'" for v in values) + ")"


def new_id(prefix: str) -> str:
    """Contract IDs are strings, e.g. "user_3f9a1c2b7d4e8f60"."""
    return f"{prefix}_{secrets.token_hex(8)}"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("user"))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Only the hash is stored. The contract's "password" field is write-only.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    profile: Mapped["Profile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    trips: Mapped[list["Trip"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Profile(Base):
    """Survey answers (contract 3.2). No row yet = onboarding not completed."""

    __tablename__ = "profiles"

    # One profile per user, so the user id is the primary key.
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    personality: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    hobbies: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    food_likes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    food_dislikes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    dietary_limits: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    liked_last_trip: Mapped[str] = mapped_column(Text, nullable=False, default="")
    disliked_last_trip: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="profile")


class Trip(Base):
    """Trip request (contract 3.3). Status lives on the plan, not here."""

    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("total_budget > 0", name="ck_trips_total_budget_positive"),
        CheckConstraint("travelers BETWEEN 1 AND 10", name="ck_trips_travelers_range"),
        CheckConstraint("end_date >= start_date", name="ck_trips_dates_order"),
        CheckConstraint("length(currency) = 3", name="ck_trips_currency_code"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("trip"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Contract sends destination as {"city", "country"}.
    destination_city: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_country: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_budget: Mapped[int] = mapped_column(Integer, nullable=False)  # whole numbers only
    currency: Mapped[str] = mapped_column(String(3), nullable=False)  # fixed at creation
    travelers: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="trips")
    plan: Mapped["Plan | None"] = relationship(
        back_populates="trip", cascade="all, delete-orphan", passive_deletes=True
    )


class Plan(Base):
    """Generated plan (contract 3.8).

    destination, dates, travelers, total_budget and currency are returned in
    the API's Plan object but read from the trip, not stored twice.
    """

    __tablename__ = "plans"
    __table_args__ = (
        CheckConstraint(f"status IN {_sql_in(PLAN_STATUSES)}", name="ck_plans_status"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("plan"))
    trip_id: Mapped[str] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    budget_split: Mapped[dict] = mapped_column(JSON, nullable=False)  # contract 3.4
    itinerary: Mapped[list[dict]] = mapped_column(JSON, nullable=False)  # list of Day, contract 3.6
    options: Mapped[dict] = mapped_column(JSON, nullable=False)  # {"flights": [...], "hotels": [...]}
    # Point at ids inside `options`, so they are not foreign keys.
    selected_flight_id: Mapped[str | None] = mapped_column(String(64))
    selected_hotel_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    trip: Mapped[Trip] = relationship(back_populates="plan")
    rating: Mapped["Rating | None"] = relationship(
        back_populates="plan", cascade="all, delete-orphan", passive_deletes=True
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", passive_deletes=True
    )


class Rating(Base):
    """Plan rating (contract 3.9). One per plan."""

    __tablename__ = "ratings"
    __table_args__ = (CheckConstraint("score BETWEEN 1 AND 5", name="ck_ratings_score_range"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("rat"))
    plan_id: Mapped[str] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    liked: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    disliked: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    plan: Mapped[Plan] = relationship(back_populates="rating")


class Conversation(Base):
    """A chat about one plan (contract: POST /plans/{id}/chat).

    HTTP keeps no memory between requests and the frontend only sends the
    conversation_id, so the history the agent needs ("Make the budget higher",
    then "Set it to 75000 EGP") is stored here. The owner is found through
    plan -> trip -> user.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("chat"))
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    plan: Mapped[Plan] = relationship(back_populates="conversations")
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation",
        order_by="ChatMessage.created_at",  # the agent reads the history in order
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ChatMessage(Base):
    """One message in a conversation, from the user or the assistant (agent)."""

    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint(f"role IN {_sql_in(CHAT_ROLES)}", name="ck_chat_messages_role"),
        CheckConstraint(
            f"action IS NULL OR action IN {_sql_in(CHAT_ACTIONS)}", name="ck_chat_messages_action"
        ),
        # The action says what the agent did; the user's own messages have none.
        CheckConstraint("role = 'assistant' OR action IS NULL", name="ck_chat_messages_user_no_action"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("msg"))
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # user messages: 1-1000 chars (API rule)
    action: Mapped[str | None] = mapped_column(String(32))  # assistant only
    changes: Mapped[list[dict] | None] = mapped_column(JSON)  # assistant only: audit summary for the chat UI
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
