# API Contract: Personal Travel Planner

This is the single document that defines how the frontend, backend and agent talk to each other. Nobody invents their own data format. If something here needs to change, tell the team leader first, then add a line to the change log at the end.

Mock data that matches every example here lives in `mock-data/`.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api` |
| Format | JSON for every request and response (`Content-Type: application/json`) |
| Auth | `Authorization: Bearer <token>`. Public endpoints: `POST /signup`, `POST /login`, `GET /currencies/default`. Everything else needs a token. |
| Dates | `YYYY-MM-DD` |
| Date-times | `YYYY-MM-DDTHH:MM` (local time at the place) |
| Money | **Whole numbers only**, no decimals, always in the plan's `currency` |
| IDs | Strings (for example `plan_001`) |
| Ownership | A user can only read or change their own data. Someone else's data returns `404`. |
| Passwords | Stored hashed. Never returned by any endpoint. |
| Group prices | Every `estimated_cost`, `price` and budget amount is the **total for the whole group**, not per person. |

---

## 2. Enums (allowed values)

Use these values exactly. Anything else is rejected with `400`.

| Field | Allowed values |
|---|---|
| `status` | `draft`, `confirmed`, `cancelled` |
| `personality` | `calm`, `adventurous`, `foodie`, `landmark-loving`, `history-loving`, `style-loving`, `exploring` |
| `time_slot` | `morning`, `afternoon`, `evening` |
| `category` | `hotel`, `food`, `activities`, `transport` |
| `currency` | `USD`, `EUR`, `GBP`, `JPY`, `CNY`, `CHF`, `CAD`, `AUD`, `INR`, `TRY`, `EGP`, `SAR`, `AED`, `MAD` |
| `dietary_limits` (items) | `vegetarian`, `vegan`, `halal`, `gluten-free`, `dairy-free`, `nut-free` |
| `hobbies` (items) | `hiking`, `diving`, `photography`, `museums`, `beaches`, `nightlife`, `cooking`, `wildlife`, `cycling`, `music`, `art`, `local-markets` |

The data holds the hyphenated values. The frontend shows friendly labels:

| Value | Label shown to the user |
|---|---|
| `calm` | Calm |
| `adventurous` | Adventurous |
| `foodie` | Foodie |
| `landmark-loving` | Landmark lover |
| `history-loving` | History lover |
| `style-loving` | Style lover |
| `exploring` | Explorer |

### Destination and currency rules

All trips must be within Egypt. The destination `country` must be exactly
`"Egypt"`; destinations in any other country are rejected.

The user must select the currency they want to use when creating a trip.
There is no automatic default currency. The selected currency is used for
the total budget, budget split, activity costs, flight prices and hotel
prices throughout the plan.

The public currency list endpoint is `GET /currencies`.

---

## 3. Data shapes

### 3.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `email` | string | Unique |
| `created_at` | string | `YYYY-MM-DD` |
| `password` | string | At least 8 characters. Stored hashed. Write-only: sent in signup and login requests, never returned.

```json
{
  "id": "user_001",
  "email": "sara@example.com",
  "created_at": "2026-10-04"
}
```

### 3.2 Profile (survey answers, the system's memory)

| Field | Type | Required | Notes |
|---|---|---|---|
| `personality` | string[] | yes | 1 to 3 values from the `personality` enum |
| `hobbies` | string[] | yes | At least 1 value from the `hobbies` enum |
| `food_likes` | string[] | yes | Free-text tags, may be empty, max 10 |
| `food_dislikes` | string[] | yes | Free-text tags, may be empty, max 10 |
| `dietary_limits` | string[] | yes | Values from the `dietary_limits` enum, may be empty |
| `liked_last_trip` | string | yes | Free text, may be `""` |
| `disliked_last_trip` | string | yes | Free text, may be `""` |

```json
{
  "personality": ["foodie", "history-loving"],
  "hobbies": ["museums", "photography", "local-markets"],
  "food_likes": ["seafood", "grilled meat", "koshari"],
  "food_dislikes": ["very spicy food"],
  "dietary_limits": ["halal"],
  "liked_last_trip": "Small group tours and walking through old neighbourhoods.",
  "disliked_last_trip": "Long bus rides and crowded beaches."
}
```

### 3.3 Trip request

| Field | Type | Required | Notes |
|---|---|---|---|
| `destination` | object | yes | `{ "city": string, "country": "Egypt" }`. Only Egyptian cities are allowed. |
| `start_date` | string | yes | Not in the past |
| `end_date` | string | yes | On or after `start_date`. Maximum trip length is 14 days. |
| `total_budget` | integer | yes | Greater than 0 |
| `currency` | string | yes | The currency selected by the user, from the `currency` enum. |
| `travelers` | integer | yes | 1 to 10 |

```json
{
  "destination": { "city": "Sharm El Sheikh", "country": "Egypt" },
  "start_date": "2026-11-10",
  "end_date": "2026-11-12",
  "total_budget": 60000,
  "currency": "EGP",
  "travelers": 2
}
```

Number of days = `end_date` - `start_date` + 1. The example above is a 3-day trip.

### 3.4 Budget split

| Field | Type | Notes |
|---|---|---|
| `hotel` | integer | |
| `food` | integer | |
| `activities` | integer | |
| `transport` | integer | Includes flights and local transfers |

**Rule:** `hotel + food + activities + transport` must equal the plan's `total_budget` exactly. The backend rejects any split that does not.

```json
{
  "hotel": 24000,
  "food": 12000,
  "activities": 14000,
  "transport": 10000
}
```

### 3.5 Activity/Itinerary

| Field | Type | Notes |
|---|---|---|
| `id` | string | Assigned by the backend if missing |
| `title` | string | Short, for the timeline card |
| `description` | string | One or two real sentences |
| `time_slot` | string | `morning`, `afternoon` or `evening` |
| `estimated_cost` | integer | Whole group, plan currency. `0` is allowed. |
| `category` | string | `hotel`, `food`, `activities` or `transport` |

```json
{
  "id": "act_001",
  "title": "Airport transfer to the hotel",
  "description": "Private car from Sharm El Sheikh airport to the hotel in Naama Bay, about 20 minutes.",
  "time_slot": "morning",
  "estimated_cost": 600,
  "category": "transport"
}
```

**Rules for the agent:**
- The hotel's real cost comes from the selected hotel option (section 3.7), not from the itinerary. Hotel-category activities (check-in, check-out) have `estimated_cost` of `0`.
- For each category, the sum of `estimated_cost` across all activities must not exceed that category's amount in the budget split.
- Calm profiles get fewer activities per day (about 2 to 3). Adventurous profiles get denser days (about 4 to 5).

### 3.6 Day

| Field | Type | Notes |
|---|---|---|
| `day` | integer | Starts at 1 |
| `date` | string | `YYYY-MM-DD`, one day after the previous |
| `activities` | Activity[] | In the order they happen, at least 1 |

```json
{
  "day": 1,
  "date": "2026-11-10",
  "activities": [ { "...": "Activity objects, see 3.5" } ]
}
```

The itinerary is a list of Day objects covering every date from `start_date` to `end_date`, with no gaps.

### 3.7 Suggested options (mock)

Flights and hotels are static mock data. Real booking is out of scope.

**Flight**

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `airline` | string | |
| `outbound` | object | `{ "from", "to", "departure", "arrival" }`, airport codes and date-times |
| `return` | object | Same shape as `outbound` |
| `price` | integer | Return price for all travelers, plan currency |
| `details` | string | For example "Direct, 1 cabin bag included" |

**Hotel**

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `stars` | integer | 1 to 5 |
| `area` | string | Neighbourhood |
| `price_per_night` | integer | Whole room or rooms for the group, plan currency |
| `total_price` | integer | `price_per_night` times the number of nights |
| `details` | string | |
| `image_url` | string | Path to a real photo |

```json
{
  "flights": [
    {
      "id": "flt_001",
      "airline": "EgyptAir",
      "outbound": { "from": "CAI", "to": "SSH", "departure": "2026-11-10T08:30", "arrival": "2026-11-10T09:45" },
      "return": { "from": "SSH", "to": "CAI", "departure": "2026-11-12T20:00", "arrival": "2026-11-12T21:15" },
      "price": 7000,
      "details": "Direct flight, one cabin bag each."
    }
  ],
  "hotels": [
    {
      "id": "htl_001",
      "name": "Coral Bay Resort",
      "stars": 4,
      "area": "Naama Bay",
      "price_per_night": 12000,
      "total_price": 24000,
      "details": "Breakfast included, five minutes from the beach.",
      "image_url": "/images/hotels/coral-bay.jpg"
    }
  ]
}
```

(These hotel names and prices are mock values.)

### 3.8 Plan

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `trip_id` | string | |
| `status` | string | `draft`, `confirmed` or `cancelled` |
| `destination` | object | `{ "city", "country": "Egypt" }` |
| `start_date`, `end_date` | string | |
| `travelers` | integer | |
| `total_budget` | integer | |
| `currency` | string | **One currency for the whole plan.** Fixed when the trip is created and never changes. |
| `budget_split` | object | Section 3.4 |
| `itinerary` | Day[] | Section 3.6 |
| `options` | object | `{ "flights": [...], "hotels": [...] }`, section 3.7 |
| `selected_flight_id` | string or null | |
| `selected_hotel_id` | string or null | |
| `created_at`, `updated_at` | string | `YYYY-MM-DD` |

The example below shows only Day 1 to keep this document readable. The full 3-day plan is in `mock-data/plan-sharm-el-sheikh.json`.

```json
{
  "id": "plan_001",
  "trip_id": "trip_001",
  "status": "draft",
  "destination": { "city": "Sharm El Sheikh", "country": "Egypt" },
  "start_date": "2026-11-10",
  "end_date": "2026-11-12",
  "travelers": 2,
  "total_budget": 60000,
  "currency": "EGP",
  "budget_split": { "hotel": 24000, "food": 12000, "activities": 14000, "transport": 10000 },
  "itinerary": [
    {
      "day": 1,
      "date": "2026-11-10",
      "activities": [
        {
          "id": "act_001",
          "title": "Airport transfer to the hotel",
          "description": "Private car from Sharm El Sheikh airport to the hotel in Naama Bay, about 20 minutes.",
          "time_slot": "morning",
          "estimated_cost": 600,
          "category": "transport"
        },
        {
          "id": "act_002",
          "title": "Hotel check-in",
          "description": "Drop the bags, freshen up and pick up the hotel map.",
          "time_slot": "afternoon",
          "estimated_cost": 0,
          "category": "hotel"
        },
        {
          "id": "act_003",
          "title": "Late lunch at Farsha Cafe",
          "description": "Grilled fish and mezze on the terrace, a good first taste of the local seafood.",
          "time_slot": "afternoon",
          "estimated_cost": 900,
          "category": "food"
        },
        {
          "id": "act_004",
          "title": "Walk along the Naama Bay promenade",
          "description": "An easy evening walk past the shops and cafes by the water.",
          "time_slot": "evening",
          "estimated_cost": 0,
          "category": "activities"
        }
      ]
    }
  ],
  "options": { "flights": [ { "id": "flt_001" } ], "hotels": [ { "id": "htl_001" } ] },
  "selected_flight_id": "flt_001",
  "selected_hotel_id": "htl_001",
  "created_at": "2026-10-04",
  "updated_at": "2026-10-04"
}
```

In the example, `options` is shortened to ids. Real responses contain the full Flight and Hotel objects from section 3.7.

**Status transitions**

| From | To | How |
|---|---|---|
| `draft` | `confirmed` | `POST /plans/{id}/confirm` |
| `draft` | `cancelled` | `POST /plans/{id}/cancel` |
| `confirmed` | `cancelled` | `POST /plans/{id}/cancel` |

Any other change returns `409 INVALID_STATUS_TRANSITION`. A `cancelled` plan is final.

### 3.9 Rating

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `plan_id` | string | |
| `score` | integer | 1 to 5 |
| `liked` | string[] | Free-text items, may be empty |
| `disliked` | string[] | Free-text items, may be empty |
| `comment` | string | May be `""` |
| `created_at` | string | |

```json
{
  "id": "rat_001",
  "plan_id": "plan_001",
  "score": 4,
  "liked": ["The snorkelling day", "Evening at the old market"],
  "disliked": ["Too much time in transit on day 1"],
  "comment": "Great mix of relaxed and active. The transfers took longer than the plan said.",
  "created_at": "2026-11-13"
}
```

---

## 4. Endpoints

Each endpoint follows the same layout. Error codes are explained in section 5.

### POST /signup

**Purpose:** Create an account.
**Auth:** none

Request:
```json
{ "email": "sara@example.com", "password": "at-least-8-chars" }
```

Response `201`:
```json
{
  "user": { "id": "user_001", "email": "sara@example.com", "created_at": "2026-10-04" },
  "token": "eyJhbGciOi..."
}
```

Errors: `400 VALIDATION_ERROR` (bad email, password under 8 characters), `409 EMAIL_TAKEN`.

---

### POST /login

**Purpose:** Sign in.
**Auth:** none

Request:
```json
{ "email": "sara@example.com", "password": "at-least-8-chars" }
```

Response `200`: same shape as signup.

Errors: `401 INVALID_CREDENTIALS`.

---

### GET /profile

**Purpose:** Read the survey answers. The frontend uses `onboarding_completed` to decide whether to show the survey after login.
**Auth:** required

Response `200` (survey not done yet):
```json
{ "onboarding_completed": false, "profile": null }
```

Response `200` (survey done):
```json
{
  "onboarding_completed": true,
  "profile": {
    "personality": ["foodie", "history-loving"],
    "hobbies": ["museums", "photography", "local-markets"],
    "food_likes": ["seafood", "grilled meat", "koshari"],
    "food_dislikes": ["very spicy food"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "Small group tours and walking through old neighbourhoods.",
    "disliked_last_trip": "Long bus rides and crowded beaches."
  }
}
```

Errors: `401 UNAUTHORIZED`.

---

### PUT /profile

**Purpose:** Save the survey answers, either the first time or when editing. Replaces the whole profile.
**Auth:** required

Request: the Profile object (section 3.2).

Response `200`: same shape as `GET /profile` with `onboarding_completed: true`.

Errors: `400 VALIDATION_ERROR` (for example 4 personality values, unknown hobby), `401 UNAUTHORIZED`.

---

### GET /currencies

**Purpose:** Get the currencies available in the currency selector on the trip form.
**Auth:** none

Response `200`:
```json
{
  "supported": ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "TRY", "EGP", "SAR", "AED", "MAD"]
}
```

The frontend must not preselect a currency. The user must choose one before
submitting `POST /trips`.

---

### POST /trips

**Purpose:** Create a trip and generate a draft plan. The agent reads the user's profile and the trip request, then builds the itinerary, budget split and options.
**Auth:** required

Request: the Trip request object (section 3.3).

Response `201`:
```json
{
  "trip_id": "trip_001",
  "plan": { "...": "full Plan object, section 3.8, with status draft" }
}
```

Errors: `400 VALIDATION_ERROR` (dates, budget, travelers, missing currency), `400 INVALID_CURRENCY`, `400 INVALID_DESTINATION`, `401 UNAUTHORIZED`, `409 PROFILE_REQUIRED` (survey not completed), `502 GENERATION_FAILED`.

Notes:
- `currency` is selected by the user and is required. The plan always returns the selected currency.
- `destination.country` must be `"Egypt"`. The backend rejects all other countries.
- Generation can take several seconds (this is the "Generating" screen). In the MVP the request stays open until the plan is ready.
- The agent must return an itinerary that follows section 3.5 and a budget split that sums to `total_budget`.

---

### GET /trips

**Purpose:** List the user's trips for the My trips page, newest first. Cancelled trips are included.
**Auth:** required

Response `200`:
```json
{
  "trips": [
    {
      "trip_id": "trip_001",
      "plan_id": "plan_001",
      "destination": { "city": "Sharm El Sheikh", "country": "Egypt" },
      "start_date": "2026-11-10",
      "end_date": "2026-11-12",
      "travelers": 2,
      "total_budget": 60000,
      "currency": "EGP",
      "status": "draft",
      "rated": false
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`.

---

### GET /trips/{id}

**Purpose:** Read one trip with its plan.
**Auth:** required

Response `200`:
```json
{
  "trip_id": "trip_001",
  "plan": { "...": "full Plan object, section 3.8" },
  "rating": null
}
```

`rating` is the Rating object (section 3.9) once the user has rated, otherwise `null`.

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

---

### PUT /plans/{id}

**Purpose:** Save the user's edits to a draft: remove, add or change activities, change the budget split, or pick a different flight or hotel.
**Auth:** required

Request (all fields optional, send at least one):
```json
{
  "itinerary": [ { "...": "full list of Day objects" } ],
  "budget_split": { "hotel": 22000, "food": 14000, "activities": 14000, "transport": 10000 },
  "selected_flight_id": "flt_001",
  "selected_hotel_id": "htl_002"
}
```

Response `200`: the updated Plan object.

Errors: `400 VALIDATION_ERROR` (budget split does not sum to `total_budget`, itinerary has a date gap, unknown enum value), `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 PLAN_NOT_EDITABLE`.

Notes:
- Only works while `status` is `draft`.
- `itinerary`, when sent, replaces the whole itinerary. Activities without an `id` get one from the backend.
- `currency` and `total_budget` cannot be edited here.

---

### POST /plans/{id}/chat

**Purpose:** Refine a draft plan through a natural-language chat message. The agent reads the current plan, the user's profile and the conversation history, then applies an unambiguous request and regenerates the affected parts of the plan.
**Auth:** required

Request:
```json
{
  "conversation_id": "chat_001",
  "message": "I don't like seafood. Replace seafood meals with vegetarian options and add one more romantic place."
}
```

`conversation_id` is optional on the first message. The backend creates one when it is omitted; the frontend sends the returned value on later messages. `message` must be between 1 and 1000 characters.

Response `200` (request understood and applied):
```json
{
  "conversation_id": "chat_001",
  "message": {
    "id": "msg_002",
    "role": "assistant",
    "content": "Done. I replaced the seafood meals with vegetarian options and added a sunset dinner for two on day 2.",
    "created_at": "2026-10-05T12:30"
  },
  "action": "updated",
  "changes": [
    {
      "type": "replace_activity",
      "description": "Replaced seafood meals with vegetarian options.",
      "day": 1
    },
    {
      "type": "add_activity",
      "description": "Added a romantic sunset dinner for two.",
      "day": 2
    }
  ],
  "trip": { "...": "updated Trip object, section 3.3" },
  "plan": { "...": "full updated Plan object, section 3.8" }
}
```

Response `200` (clarification needed):
```json
{
  "conversation_id": "chat_001",
  "message": {
    "id": "msg_003",
    "role": "assistant",
    "content": "What total budget would you like me to use? Please include the amount and currency.",
    "created_at": "2026-10-05T12:31"
  },
  "action": "needs_clarification",
  "changes": [],
  "trip": null,
  "plan": null
}
```

When clarification is needed, the frontend displays the assistant's question and sends
the user's answer as the next message with the same `conversation_id`. The assistant
must continue asking focused clarification questions until it has enough information
to perform the requested action. It must not apply a partial or guessed change.
For example, after asking for the new budget, the user might send:
`"Set it to 75000 EGP."` The next response is then an `updated` response containing
the changes and the complete updated trip and plan.

Supported requests include changing or replacing activities, adding or reducing activity density, avoiding foods or places, adding themes such as romantic activities, changing `total_budget`, and changing the trip length. A budget change must include an amount and currency; a length change must include a number of days or a new end date. The agent must preserve the user's dietary limits and explicit dislikes even when the request is vague.

Rules:
- Only `draft` plans can be refined. Each successful update is saved immediately and returns the complete updated trip and plan.
- The endpoint may change `total_budget`, `start_date` and `end_date`, unlike `PUT /plans/{id}`. It must revalidate the trip rules in section 3.3, regenerate the itinerary when the number of days changes, and make the budget split sum exactly to the new total.
- Currency, destination and traveler count are unchanged unless a future contract version explicitly adds support for them.
- The agent must not invent a silent interpretation for an ambiguous amount, date, food restriction or destination. It returns `needs_clarification` instead.
- Clarification messages are part of the same conversation and do not modify the trip or plan.
- Each clarification response must ask only for the missing information needed for the next safe decision.
- The response `changes` is a concise audit summary for the chat UI; the returned `plan` is the source of truth.

Errors: `400 VALIDATION_ERROR` (empty or oversized message), `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 PLAN_NOT_EDITABLE`, `502 GENERATION_FAILED`.

---

### POST /plans/{id}/confirm

**Purpose:** Confirm a draft. After this the plan can no longer be edited.
**Auth:** required
**Request body:** none

Response `200`: the Plan object with `"status": "confirmed"`.

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 INVALID_STATUS_TRANSITION`.

---

### POST /plans/{id}/cancel

**Purpose:** Cancel a draft or confirmed plan.
**Auth:** required
**Request body:** none

Response `200`: the Plan object with `"status": "cancelled"`.

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 INVALID_STATUS_TRANSITION`.

---

### POST /ratings

**Purpose:** Save the rating and feedback for a confirmed plan. These ratings are used to improve future plans.
**Auth:** required

Request:
```json
{
  "plan_id": "plan_001",
  "score": 4,
  "liked": ["The snorkelling day", "Evening at the old market"],
  "disliked": ["Too much time in transit on day 1"],
  "comment": "Great mix of relaxed and active."
}
```

Response `201`: the Rating object (section 3.9).

Errors: `400 VALIDATION_ERROR` (score outside 1 to 5), `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 RATING_NOT_ALLOWED` (plan is not confirmed), `409 ALREADY_RATED`.

Notes: One rating per plan. Ratings are stored against the user's profile so the agent can read them when building later plans.

---

## 5. Error format

Every error uses this shape:

```json
{
  "error": {
    "code": "INVALID_CURRENCY",
    "message": "Currency 'XYZ' is not supported."
  }
}
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is missing, malformed or outside its allowed values |
| 400 | `INVALID_CURRENCY` | Currency is not in the supported list |
| 400 | `INVALID_DESTINATION` | The destination country is not Egypt or the city is not supported |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 404 | `NOT_FOUND` | The item does not exist or belongs to someone else |
| 409 | `EMAIL_TAKEN` | An account with that email already exists |
| 409 | `PROFILE_REQUIRED` | The survey must be completed before planning a trip |
| 409 | `PLAN_NOT_EDITABLE` | Only draft plans can be edited |
| 409 | `INVALID_STATUS_TRANSITION` | The status change is not allowed (section 3.8) |
| 409 | `RATING_NOT_ALLOWED` | Only confirmed plans can be rated |
| 409 | `ALREADY_RATED` | This plan already has a rating |
| 502 | `GENERATION_FAILED` | The agent failed or returned invalid data |

### Contract change log

| Date | Change |
|---|---|
| 2026-10-06 | Restricted trips to Egyptian destinations and made currency selection mandatory for users. Replaced `GET /currencies/default` with `GET /currencies`. |
