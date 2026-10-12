"""Pydantic schemas — strictly aligned to docs/api-contract.md.

Every model, enum, and validator here is the single source of truth for the
agent layer. If the contract changes, update this file first.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Enums — contract §2 (closed lists, unknown values are rejected)
# ---------------------------------------------------------------------------

PersonalityEnum = Literal[
    "calm", "adventurous", "foodie", "landmark-loving",
    "history-loving", "style-loving", "exploring",
]

HobbiesEnum = Literal[
    "hiking", "diving", "photography", "museums", "beaches",
    "nightlife", "cooking", "wildlife", "cycling", "music",
    "art", "local-markets",
]

DietaryLimitsEnum = Literal[
    "vegetarian", "vegan", "halal", "gluten-free",
    "dairy-free", "nut-free",
]

TimeSlotEnum = Literal["morning", "afternoon", "evening"]
CategoryEnum = Literal["hotel", "food", "activities", "transport"]
StatusEnum = Literal["draft", "confirmed", "cancelled"]

CurrencyEnum = Literal[
    "USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD",
    "AUD", "INR", "TRY", "EGP", "SAR", "AED", "MAD",
]

# ---------------------------------------------------------------------------
# Profile & trip request — contract §3.2, §3.3
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """Survey answers stored as the system's memory (contract §3.2)."""
    personality: List[PersonalityEnum]
    hobbies: List[HobbiesEnum]
    food_likes: List[str]
    food_dislikes: List[str]
    dietary_limits: List[DietaryLimitsEnum]
    liked_last_trip: Optional[str] = ""
    disliked_last_trip: Optional[str] = ""


class Destination(BaseModel):
    city: str
    country: str


class TripRequest(BaseModel):
    """What the user fills in on the trip form (contract §3.3)."""
    destination: Destination
    start_date: str
    end_date: str
    total_budget: int = Field(gt=0)
    currency: CurrencyEnum
    travelers: int = Field(ge=1, le=10)

# ---------------------------------------------------------------------------
# Inter-agent data (internal pipeline, not exposed in the API)
# ---------------------------------------------------------------------------

class Agent1Output(BaseModel):
    """Context Parser output — traits, constraints, and search queries."""
    user_traits: List[str]
    strict_constraints: List[str]
    search_queries: List[str] = Field(max_length=3)


class VerifiedPlace(BaseModel):
    """A single real place found by the Destination Searcher."""
    name: str
    category: CategoryEnum
    description: str
    estimated_cost: int = Field(ge=0)


class Agent2Output(BaseModel):
    """Destination Searcher output — list of verified real places."""
    verified_places: List[VerifiedPlace]

# ---------------------------------------------------------------------------
# Plan components — contract §3.4, §3.5, §3.6, §3.7
# ---------------------------------------------------------------------------

class BudgetSplit(BaseModel):
    """Budget breakdown (contract §3.4). Must sum to total_budget."""
    hotel: int = Field(ge=0)
    food: int = Field(ge=0)
    activities: int = Field(ge=0)
    transport: int = Field(ge=0)


class ActivityItem(BaseModel):
    """A single activity in the itinerary (contract §3.5)."""
    id: Optional[str] = None
    title: str
    description: str
    time_slot: TimeSlotEnum
    estimated_cost: int = Field(ge=0)
    category: CategoryEnum


class DayPlan(BaseModel):
    """One day in the itinerary (contract §3.6)."""
    day: int = Field(ge=1)
    date: str
    activities: List[ActivityItem] = Field(min_length=1)


class FlightLeg(BaseModel):
    """One direction of a flight (contract §3.7)."""
    from_airport: str = Field(alias="from")
    to_airport: str = Field(alias="to")
    departure: str
    arrival: str

    model_config = {"populate_by_name": True}


class Flight(BaseModel):
    """A suggested flight option (contract §3.7)."""
    id: str
    airline: str
    outbound: FlightLeg
    return_leg: FlightLeg = Field(alias="return")
    price: int = Field(ge=0)
    details: str

    model_config = {"populate_by_name": True}


class Hotel(BaseModel):
    """A suggested hotel option (contract §3.7)."""
    id: str
    name: str
    stars: int = Field(ge=1, le=5)
    area: str
    price_per_night: int = Field(ge=0)
    total_price: int = Field(ge=0)
    details: str
    image_url: str


class Options(BaseModel):
    """Flight and hotel suggestions (contract §3.7)."""
    flights: List[Flight] = []
    hotels: List[Hotel] = []

# ---------------------------------------------------------------------------
# Final plan — contract §3.8
# ---------------------------------------------------------------------------

class FinalPlanResponse(BaseModel):
    """The complete plan object returned by the agent (contract §3.8).

    Validators enforce:
      - budget_split sums to total_budget exactly
      - all financial values are integers
      - itinerary covers every date with no gaps
    """
    id: str = "plan_001"
    trip_id: str = "trip_001"
    status: StatusEnum = "draft"
    destination: Destination
    start_date: str
    end_date: str
    travelers: int = Field(ge=1, le=10)
    total_budget: int = Field(gt=0)
    currency: CurrencyEnum
    budget_split: BudgetSplit
    itinerary: List[DayPlan] = Field(min_length=1)
    options: Options = Options()
    selected_flight_id: Optional[str] = None
    selected_hotel_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: date.today().isoformat())
    updated_at: str = Field(default_factory=lambda: date.today().isoformat())

    # -- Validators ----------------------------------------------------------

    @model_validator(mode="after")
    def validate_budget_sum(self) -> "FinalPlanResponse":
        bs = self.budget_split
        total = bs.hotel + bs.food + bs.activities + bs.transport
        if total != self.total_budget:
            raise ValueError(
                f"budget_split sums to {total}, must equal total_budget "
                f"({self.total_budget})"
            )
        return self

    @model_validator(mode="after")
    def validate_date_continuity(self) -> "FinalPlanResponse":
        start = date.fromisoformat(self.start_date)
        end = date.fromisoformat(self.end_date)
        expected_days = (end - start).days + 1
        if len(self.itinerary) != expected_days:
            raise ValueError(
                f"Itinerary has {len(self.itinerary)} days, expected "
                f"{expected_days} ({self.start_date} to {self.end_date})"
            )
        return self

    @model_validator(mode="after")
    def validate_integer_costs(self) -> "FinalPlanResponse":
        for day in self.itinerary:
            for act in day.activities:
                if not isinstance(act.estimated_cost, int):
                    raise ValueError(
                        f"Activity '{act.title}' has non-integer cost: "
                        f"{act.estimated_cost}"
                    )
        return self
