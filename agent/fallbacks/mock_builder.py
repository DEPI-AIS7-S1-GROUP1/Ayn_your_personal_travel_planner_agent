"""Tier 3 fallback — Deterministic Mock Builder.

Called when both CrewAI and direct Groq fail. Builds a structurally valid
plan from templates. This NEVER fails — it guarantees the API always
returns something usable.
"""

import logging
from datetime import date, timedelta

from agent.schemas import (
    BudgetSplit,
    ActivityItem,
    DayPlan,
    Destination,
    FlightLeg,
    Flight,
    Hotel,
    Options,
    FinalPlanResponse,
)

logger = logging.getLogger(__name__)


def build_mock_plan(profile: dict, trip: dict) -> FinalPlanResponse:
    """Build a valid plan deterministically from templates.

    Budget split: 40% hotel, 20% food, 25% activities, 15% transport.
    The transport category absorbs rounding remainder to guarantee exact sum.
    """
    start = date.fromisoformat(trip["start_date"])
    end = date.fromisoformat(trip["end_date"])
    num_days = (end - start).days + 1
    budget = trip["total_budget"]
    currency = trip.get("currency", "EGP")
    city = trip["destination"]["city"]
    country = trip["destination"]["country"]
    travelers = trip["travelers"]
    today = date.today().isoformat()

    # --- Budget split (remainder goes to transport) ---
    hotel = int(budget * 0.40)
    food = int(budget * 0.20)
    activities = int(budget * 0.25)
    transport = budget - hotel - food - activities  # exact sum guaranteed

    budget_split = BudgetSplit(
        hotel=hotel, food=food, activities=activities, transport=transport
    )

    # --- Per-day budget allocation ---
    food_per_day = food // num_days
    activities_per_day = activities // num_days
    transport_per_day = transport // num_days

    # --- Build itinerary ---
    itinerary = []
    act_counter = 1

    for day_num in range(1, num_days + 1):
        current_date = (start + timedelta(days=day_num - 1)).isoformat()
        day_activities = []

        # First day: arrival + check-in
        if day_num == 1:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Airport transfer to the hotel",
                description=f"Private car from {city} airport to the hotel.",
                time_slot="morning",
                estimated_cost=transport_per_day // 2,
                category="transport",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title="Hotel check-in",
                description="Drop the bags, freshen up and settle in.",
                time_slot="afternoon",
                estimated_cost=0,
                category="hotel",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Lunch in {city}",
                description=f"A welcoming first meal at a local restaurant in {city}.",
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Evening walk in {city}",
                description=f"An easy evening stroll to explore the area.",
                time_slot="evening",
                estimated_cost=0,
                category="activities",
            ))
            act_counter += 1

        # Last day: check-out + departure
        elif day_num == num_days:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Morning sightseeing in {city}",
                description=f"A last morning exploring highlights of {city}.",
                time_slot="morning",
                estimated_cost=activities_per_day // 2,
                category="activities",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title="Hotel check-out",
                description="Leave bags with reception until departure.",
                time_slot="morning",
                estimated_cost=0,
                category="hotel",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Farewell lunch in {city}",
                description=f"A last relaxed meal before heading home.",
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title="Transfer to the airport",
                description=f"Private car from the hotel to {city} airport.",
                time_slot="afternoon",
                estimated_cost=transport_per_day // 2,
                category="transport",
            ))
            act_counter += 1

        # Middle days: full day of activities
        else:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Morning activity in {city}",
                description=f"Explore a top-rated attraction in {city}.",
                time_slot="morning",
                estimated_cost=activities_per_day // 2,
                category="activities",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Lunch in {city}",
                description=f"A mid-day meal at a popular local spot.",
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Afternoon excursion in {city}",
                description=f"Guided tour or free exploration in {city}.",
                time_slot="afternoon",
                estimated_cost=activities_per_day // 2,
                category="activities",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=f"Dinner in {city}",
                description=f"Evening meal at a recommended restaurant.",
                time_slot="evening",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

        itinerary.append(DayPlan(
            day=day_num,
            date=current_date,
            activities=day_activities,
        ))

    # --- Mock flight & hotel options ---
    num_nights = num_days - 1 if num_days > 1 else 1
    hotel_price_per_night = hotel // num_nights

    options = Options(
        flights=[
            Flight(
                id="flt_001",
                airline="Mock Airline A",
                outbound=FlightLeg(
                    **{
                        "from": "CAI",
                        "to": city[:3].upper(),
                        "departure": f"{trip['start_date']}T08:00",
                        "arrival": f"{trip['start_date']}T09:30",
                    }
                ),
                **{
                    "return": FlightLeg(
                        **{
                            "from": city[:3].upper(),
                            "to": "CAI",
                            "departure": f"{trip['end_date']}T20:00",
                            "arrival": f"{trip['end_date']}T21:30",
                        }
                    ),
                },
                price=transport // 2,
                details="Direct flight, cabin bag included.",
            ),
            Flight(
                id="flt_002",
                airline="Mock Airline B",
                outbound=FlightLeg(
                    **{
                        "from": "CAI",
                        "to": city[:3].upper(),
                        "departure": f"{trip['start_date']}T07:00",
                        "arrival": f"{trip['start_date']}T08:30",
                    }
                ),
                **{
                    "return": FlightLeg(
                        **{
                            "from": city[:3].upper(),
                            "to": "CAI",
                            "departure": f"{trip['end_date']}T18:00",
                            "arrival": f"{trip['end_date']}T19:30",
                        }
                    ),
                },
                price=int(transport * 0.4),
                details="Direct flight, checked bag extra.",
            ),
        ],
        hotels=[
            Hotel(
                id="htl_001",
                name=f"{city} Central Hotel",
                stars=4,
                area="City Centre",
                price_per_night=hotel_price_per_night,
                total_price=hotel,
                details="Breakfast included, central location.",
                image_url="/images/hotels/placeholder-1.jpg",
            ),
            Hotel(
                id="htl_002",
                name=f"{city} Budget Inn",
                stars=3,
                area="Downtown",
                price_per_night=int(hotel_price_per_night * 0.7),
                total_price=int(hotel_price_per_night * 0.7) * num_nights,
                details="Clean rooms, free Wi-Fi.",
                image_url="/images/hotels/placeholder-2.jpg",
            ),
        ],
    )

    plan = FinalPlanResponse(
        id="plan_001",
        trip_id="trip_001",
        status="draft",
        destination=Destination(city=city, country=country),
        start_date=trip["start_date"],
        end_date=trip["end_date"],
        travelers=travelers,
        total_budget=budget,
        currency=currency,
        budget_split=budget_split,
        itinerary=itinerary,
        options=options,
        selected_flight_id="flt_001",
        selected_hotel_id="htl_001",
        created_at=today,
        updated_at=today,
    )

    logger.info("Tier 3 mock builder produced a valid plan")
    return plan
