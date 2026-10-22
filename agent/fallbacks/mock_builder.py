"""Tier 3 fallback — Deterministic Mock Builder.

Called when both CrewAI and direct Groq fail. Builds a structurally valid
plan from templates. This NEVER fails — it guarantees the API always
returns something usable.
"""

import logging
from datetime import date, timedelta

from agent.arabic import city_name_ar, trip_language
from agent.tools.restaurant_search import CITY_ICONIC_RESTAURANTS
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


def build_mock_plan(profile: dict, trip: dict, restaurant_names: list[str] | None = None) -> FinalPlanResponse:
    """Build a valid plan deterministically from templates.

    Budget split: 40% hotel, 20% food, 25% activities, 15% transport.
    The transport category absorbs rounding remainder to guarantee exact sum.
    restaurant_names: real names from agent/tools/restaurant_search.py, one per meal in turn.
    """
    start = date.fromisoformat(trip["start_date"])
    end = date.fromisoformat(trip["end_date"])
    num_days = (end - start).days + 1
    budget = trip["total_budget"]
    currency = trip.get("currency", "EGP")
    city = trip["destination"]["city"]
    city_ar = city_name_ar(city)  # "غداء في دهب", not "غداء في Dahab"
    country = trip["destination"]["country"]
    travelers = trip["travelers"]
    today = date.today().isoformat()
    lang = trip_language(trip)

    def loc(en: str, ar: str) -> str:
        return ar if lang == "ar" else en

    curated_spots = CITY_ICONIC_RESTAURANTS.get(city, CITY_ICONIC_RESTAURANTS.get("Cairo", []))
    names = list(restaurant_names or ([s["name"] for s in curated_spots] if curated_spots else []))
    meal_index = 0

    def meal_info(meal_en: str, meal_ar: str) -> tuple[str, str]:
        nonlocal meal_index
        if curated_spots:
            spot = curated_spots[meal_index % len(curated_spots)]
            meal_index += 1
            title = loc(f"{meal_en} at {spot['name']}", f"{meal_ar} في {spot['name']}")
            desc = loc(
                f"Try the {spot['dish_en']} in {spot['area']}.",
                f"جرّب {spot['dish_ar']} في {spot['area']}."
            )
            return title, desc
        elif names:
            name = names[meal_index % len(names)]
            meal_index += 1
            title = loc(f"{meal_en} at {name}", f"{meal_ar} في {name}")
            desc = loc(
                f"Enjoy authentic Egyptian dishes and local specialties at {name}.",
                f"استمتع بالأطباق المصرية الأصيلة والمأكولات المحلية الشهية في {name}."
            )
            return title, desc
        else:
            title = loc(f"{meal_en} in {city}", f"{meal_ar} في {city_ar}")
            desc = loc(
                f"Authentic local dining experience in {city}.",
                f"تناول وجبة محلية أصيلة في {city_ar}."
            )
            return title, desc

    def meal_title(meal_en: str, meal_ar: str) -> str:
        title, _ = meal_info(meal_en, meal_ar)
        return title

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
    is_calm = "calm" in profile.get("personality", [])

    for day_num in range(1, num_days + 1):
        current_date = (start + timedelta(days=day_num - 1)).isoformat()
        day_activities = []

        # First day: arrival + check-in
        if day_num == 1:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc("Airport transfer to the hotel", "انتقال من المطار إلى الفندق"),
                description=loc(
                    f"Private car from {city} airport to the hotel.",
                    f"سيارة خاصة من مطار {city_ar} إلى الفندق.",
                ),
                time_slot="morning",
                estimated_cost=transport_per_day // 2,
                category="transport",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc("Hotel check-in", "تسجيل الوصول إلى الفندق"),
                description=loc(
                    "Drop the bags, freshen up and settle in.",
                    "اترك الأمتعة واسترح واستقر في الغرفة.",
                ),
                time_slot="afternoon",
                estimated_cost=0,
                category="hotel",
            ))
            act_counter += 1

            m1_title, m1_desc = meal_info("Lunch", "غداء")
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=m1_title,
                description=m1_desc,
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc(f"Evening walk in {city}", f"تمشية مسائية في {city_ar}"),
                description=loc(
                    "An easy evening stroll to explore the area.",
                    "تمشية مسائية هادئة لاستكشاف المنطقة.",
                ),
                time_slot="evening",
                estimated_cost=0,
                category="activities",
            ))
            act_counter += 1

        # Last day: check-out + departure
        elif day_num == num_days:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc(f"Morning sightseeing in {city}", f"جولة صباحية في {city_ar}"),
                description=loc(
                    f"A last morning exploring highlights of {city}.",
                    f"صباح أخير لاستكشاف أبرز معالم {city_ar}.",
                ),
                time_slot="morning",
                estimated_cost=activities_per_day // 2,
                category="activities",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc("Hotel check-out", "تسجيل المغادرة من الفندق"),
                description=loc(
                    "Leave bags with reception until departure.",
                    "اترك الأمتعة عند الاستقبال حتى موعد المغادرة.",
                ),
                time_slot="morning",
                estimated_cost=0,
                category="hotel",
            ))
            act_counter += 1

            ml_title, ml_desc = meal_info("Farewell lunch", "غداء الوداع")
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=ml_title,
                description=ml_desc,
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc("Transfer to the airport", "الانتقال إلى المطار"),
                description=loc(
                    f"Private car from the hotel to {city} airport.",
                    f"سيارة خاصة من الفندق إلى مطار {city_ar}.",
                ),
                time_slot="afternoon",
                estimated_cost=transport_per_day // 2,
                category="transport",
            ))
            act_counter += 1

        # Middle days: full day of activities
        else:
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=loc(f"Morning activity in {city}", f"نشاط صباحي في {city_ar}"),
                description=loc(
                    f"Explore a top-rated attraction in {city}.",
                    f"استكشف أحد أبرز المعالم في {city_ar}.",
                ),
                time_slot="morning",
                estimated_cost=activities_per_day // 2,
                category="activities",
            ))
            act_counter += 1

            mm_title, mm_desc = meal_info("Lunch", "غداء")
            day_activities.append(ActivityItem(
                id=f"act_{act_counter:03d}",
                title=mm_title,
                description=mm_desc,
                time_slot="afternoon",
                estimated_cost=food_per_day // 2,
                category="food",
            ))
            act_counter += 1

            if not is_calm:
                day_activities.append(ActivityItem(
                    id=f"act_{act_counter:03d}",
                    title=loc(f"Afternoon excursion in {city}", f"رحلة بعد الظهر في {city_ar}"),
                    description=loc(
                        f"Guided tour or free exploration in {city}.",
                        f"جولة مرشدة أو استكشاف حر في {city_ar}.",
                    ),
                    time_slot="afternoon",
                    estimated_cost=activities_per_day // 2,
                    category="activities",
                ))
                act_counter += 1

                md_title, md_desc = meal_info("Dinner", "عشاء")
                day_activities.append(ActivityItem(
                    id=f"act_{act_counter:03d}",
                    title=md_title,
                    description=md_desc,
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
