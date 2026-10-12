# 🗺️ Personal Travel Planner — Agent Layer Documentation

## 1. Overview

The **Agent Layer** of the Personal Travel Planner is an intelligent, multi-tier background engine designed to generate personalized travel itineraries. It consumes a traveler's survey profile (`profile.json`) and specific trip parameters (`trip-request.json`), then outputs a schema-compliant, budget-balanced, day-by-day itinerary JSON conforming strictly to [`docs/api-contract.md`](./docs/api-contract.md).

The agent layer is designed for production reliability, cost/token efficiency, and graceful degradation via a **3-tier fallback ladder**.

---

## 2. Architecture & Design

### Multi-Tier Fallback Ladder

To ensure that the API **never fails** under network hiccups, LLM outages, or rate-limit saturation, generation flows through three tiers:

```
[User Profile + Trip Request]
           │
           ▼
┌──────────────────────────────────────────────┐
│  Tier 1: Multi-Agent CrewAI Pipeline         │
│  - Agent 1: Context & Constraint Parser     │
│  - Agent 2: Destination & Activity Searcher  │
│  - Agent 3: Itinerary & Budget Planner       │
│  (Powered by Groq LLM + Tavily Search API)  │
└──────────────────────┬───────────────────────┘
                       │ (On failure / rate limit)
                       ▼
┌──────────────────────────────────────────────┐
│  Tier 2: Direct Groq SDK Fallback            │
│  - Single-shot JSON Mode completion         │
│  - Bypasses multi-agent coordination        │
└──────────────────────┬───────────────────────┘
                       │ (On API outage / key missing)
                       ▼
┌──────────────────────────────────────────────┐
│  Tier 3: Deterministic Mock Builder          │
│  - Guaranteed 100% offline uptime            │
│  - Mathematical budget split & date coverage │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Post-Processor & Validation Safety Net      │
│  - Auto-repairs budget split rounding drift  │
│  - Enforces integer financial constraints    │
│  - Validates schema against FinalPlanResponse│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
             [output/plan_output.json]
```

---

## 3. Agent Specifications

### Agent 1: Context & Constraint Parser
- **Role**: `Travel Profile Analyst`
- **Goal**: Extracts personality traits, dietary limits, and disliked experiences, and formulates 2–3 targeted search queries for the destination.
- **Output**: Structured user traits, strict constraints to avoid, and search queries.

### Agent 2: Destination & Activity Searcher
- **Role**: `Destination Research Specialist`
- **Goal**: Searches the web for verified places at the destination using Tavily. Filters out attractions that violate user dietary/activity constraints.
- **Tools**: Tavily Search Tool (`search_destination`).
- **Resource Limits**: Capped at a maximum of 2–3 queries per run.

### Agent 3: Itinerary & Budget Planner
- **Role**: `Itinerary & Budget Planner`
- **Goal**: Takes verified places and constraints, splits group budget across Hotel, Food, Activities, and Transport, and generates a day-by-day itinerary with flight and hotel options.
- **Constraints**: Exact budget sum match, integer costs only, 0-cost hotel check-in/out activities, and continuous dates.

---

## 4. Token & Resource Optimization Rules

To operate efficiently within free-tier API quotas and keep latency minimal, the engine incorporates:

1. **Search Query Hard-Cap**:
   - `tavily_tool.py` maintains an internal invocation counter allowing at most 2–3 queries per run. Any further search call returns a directive forcing immediate synthesis.
   - Result snippets are limited to 3 results and truncated to 120 characters each.
   - `search_agent` is configured with `max_iter=3` to prevent recursive looping.

2. **Concise Plan Generation**:
   - Prompts mandate 1-sentence activity descriptions without conversational filler.
   - Response max tokens are budgeted to 1,000 to respect provider limits (Groq on-demand OTPM limits).

3. **Strict Closed Enum Validation**:
   - Inputs are validated against closed enums (`PersonalityEnum`, `HobbiesEnum`, `DietaryLimitsEnum`, `CurrencyEnum`).
   - Unknown values are strictly rejected upfront before consuming LLM tokens.

---

## 5. Repository File Structure

```
Personal-travel-planner-Agent/
├── agent/
│   ├── __init__.py
│   ├── schemas.py              # Single source of truth: Pydantic models & validators
│   ├── llm_config.py           # Provider LLM configuration & message sanitizer
│   ├── main.py                 # Orchestrator CLI with 3-tier fallback
│   ├── agents/
│   │   ├── context_agent.py    # Agent 1
│   │   ├── search_agent.py     # Agent 2
│   │   └── planner_agent.py    # Agent 3
│   ├── tasks/
│   │   ├── context_task.py     # Task 1 definition
│   │   ├── search_task.py      # Task 2 definition
│   │   └── planner_task.py     # Task 3 definition
│   ├── tools/
│   │   └── tavily_tool.py      # Tavily search wrapper with rate limit protection
│   ├── fallbacks/
│   │   ├── direct_groq.py      # Tier 2 direct Groq fallback
│   │   └── mock_builder.py     # Tier 3 deterministic template generator
│   └── validators/
│       └── post_processor.py   # Safety net auto-repair & validation
├── tests/
│   ├── __init__.py
│   └── validate_output.py      # Automated 8-check contract validation suite
├── mock-data/
│   ├── profile.json            # Sample user survey memory
│   └── trip-request.json       # Sample trip parameters
├── output/
│   └── plan_output.json        # Generated final plan output
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies
└── README.md
```

---

## 6. Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Groq API Key ([console.groq.com](https://console.groq.com))
- Tavily Search API Key ([app.tavily.com](https://app.tavily.com))

### Installation
```bash
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Linux/macOS

# 2. Install dependencies
pip install -r requirements.txt
```

### Environment Configuration
Create a `.env` file in the project root:
```env
GROQ_API_KEY=gsk_your_key_here
TAVILY_API_KEY=tvly-your_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

### Running the Pipeline
```bash
# Standard run (starts at Tier 1 with auto-fallback)
python -m agent.main

# Custom inputs
python -m agent.main --profile mock-data/profile.json --trip mock-data/trip-request.json

# Force a specific tier for testing
python -m agent.main --tier 1   # Force CrewAI pipeline
python -m agent.main --tier 2   # Force Direct Groq SDK
python -m agent.main --tier 3   # Force Deterministic Mock (no API keys needed)
```

### Running Validation Tests
```bash
python -m tests.validate_output output/plan_output.json
```
Verifies all 8 contractual invariants:
1. `schema_valid`: Full validation against `FinalPlanResponse` model.
2. `budget_sum`: `hotel + food + activities + transport == total_budget`.
3. `integer_costs`: All monetary values are integer types.
4. `date_coverage`: Zero date gaps from start to end date.
5. `enum_timeslots`: `morning`, `afternoon`, or `evening`.
6. `enum_categories`: `hotel`, `food`, `activities`, or `transport`.
7. `hotel_cost_zero`: Check-in/check-out items are cost 0.
8. `no_dislikes`: Enforces exclusion of items listed under `food_dislikes`.
