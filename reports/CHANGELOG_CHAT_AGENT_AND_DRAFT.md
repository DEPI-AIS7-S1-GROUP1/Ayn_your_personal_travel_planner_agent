# Ayn (أين) Personal Travel Planner — Comprehensive Changelog & Guide

This document records all changes, enhancements, and architectural components added to the **Personal Travel Planner Agent (Ayn / أين)** across the AI Agent, FastAPI Backend, React Frontend, and Security/Configuration layers.

---

## 1. Executive Summary

| Layer | Status | Key Deliverables |
|---|---|---|
| **AI Agent** | ✅ Complete | Created `chat_agent.py` with code-level guards, dual LLM engine (Gemini primary + Groq backup + mock fallback), enhanced token limits (4096), regex boundary fixes for diet & budget. |
| **Backend** | ✅ Complete | Implemented `POST /plans/{id}/chat` (5-step contract), `POST /ratings`, `POST /trips` (with `409 PROFILE_REQUIRED`), strict `PUT /plans/{id}` itinerary validation, removed non-contract endpoints, added `search_context` column to `Plan`. All 104 backend tests passing. |
| **Frontend** | ✅ Complete | Complete `react-router-dom` routing (`/plan/:id`, `/plan/:id/options`, `/plan/:id/confirmed`, `/plan/:id/rate`, `/trips`), removed all fake data fallbacks, implemented `ChatPanel` (§5.3), Options screen (§4.6/4.7), Generating screen (§4.10), Confirmed screen (§5.4) with PDF & `.ics` export, and Rating screen (§5.5). |
| **Security & Git** | ✅ Complete | Fixed indented `.gitignore` lines, regenerated 32-byte `AUTH_SECRET_KEY`, added `frontend/dist/`, `*.db`, `.pytest_cache/` ignores. |

---

## 2. API Keys & Free Trials Guide

You asked if you should bring API keys: **Yes, free trial keys make the live AI experience work with real models!**

### Available Free Trials & Where to Get Them:
1. **Google Gemini (Primary LLM)**:
   - **Where to get**: [Google AI Studio](https://aistudio.google.com/) (Completely free tier available).
   - **Environment Variable**: `GEMINI_API_KEY`
   - **Default Model**: `gemini-1.5-flash`
   - **What it powers**: The primary Chat Refinement Agent (`POST /plans/{id}/chat`) and direct plan generation.

2. **Groq (Backup LLM)**:
   - **Where to get**: [Groq Cloud Console](https://console.groq.com/) (Generous free tier with ultra-fast inference).
   - **Environment Variable**: `GROQ_API_KEY`
   - **Default Model**: `qwen/qwen3.8-27b`
   - **What it powers**: High-speed backup if Gemini rate limits or quotas are reached.

3. **Tavily Search (Search Agent)**:
   - **Where to get**: [Tavily AI](https://tavily.com/) (Free 1,000 search API credits/month).
   - **Environment Variable**: `TAVILY_API_KEY`
   - **What it powers**: Real-time web searches for Egyptian attractions, opening hours, and ticket prices in CrewAI.

### How to configure them:
Open the `.env` file at the repository root and paste your keys:
```env
AUTH_SECRET_KEY=9f62a478b3074303b8a3d76a631baddeef73ea3a50054c933150acb1393d9b60
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Paste your free trial keys here:
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b

TAVILY_API_KEY=your_tavily_api_key_here
```

> **Note on Fallback Architecture**: Even if no API keys are provided or if your free quotas run out during a demo, the entire system **gracefully falls back to deterministic mock generators** without crashing or returning errors to the user.

---

## 3. Agent Layer Changes

### 3.1 Chat Refinement Agent (`agent/agents/chat_agent.py`)
- Created `chat(plan, trip, profile, history, message, search_context) -> dict` and `chat_mock(...)`.
- **Code-Level Guards (Strictly enforced in code, never left to LLM prompts alone)**:
  1. **Immutable Parameters Guard**: Checks if the user tries to alter `currency`, `destination` (country/city), or `travelers` count. Immediately returns `action: "needs_clarification"`.
  2. **Budget Clarification Guard**: Differentiates overall trip budget adjustments from activity-level phrases (e.g., *"add a low-cost activity"* or *"find a cheap meal"* are allowed, while *"increase my budget"* requires both amount and currency). If amount or currency is missing, returns `action: "needs_clarification"` with: *"What total budget would you like me to use? Please include the amount and currency."*
  3. **Dietary & Dislike Sanitizer**: Uses strict word boundaries `\b` with negative lookaheads (e.g., `eggs?(?![\s-]?plant)` so *eggplant* is never falsely flagged as eggs; standalone `nut` so *minutes* is never flagged as nuts). Automatically removes or replaces forbidden items.
  4. **Budget Split Invariant**: Ensures that `sum(budget_split.values()) == total_budget` at all times.
- **Provider Orchestration**:
  - Tier 1: Calls Google Gemini via `google.genai` Client with `max_output_tokens=4096`.
  - Tier 2: Calls Groq Cloud via `groq` SDK with `max_tokens=4096`.
  - Tier 3: Deterministic mock refinement generator (`chat_mock`).

### 3.2 Plan Generation Token Limits & Fallbacks
- `agent/fallbacks/direct_groq.py`: Increased `max_tokens` from 1,000 to **4,096** so multi-day itinerary JSONs never get truncated.
- `agent/fallbacks/direct_gemini.py`: Added direct Gemini plan generator with 4,096 tokens.
- `agent/main.py`: Added `generate_plan_from_dict(profile, trip)` with safe, optional CrewAI imports.

---

## 4. Backend API Contract Alignment

All endpoints conform strictly to `docs/api-contract.md`:

| Endpoint | Method | Key Behavior & Guard |
|---|---|---|
| `/api/plans/{id}/chat` | `POST` | 1. Authenticates & verifies ownership.<br>2. Rejects non-draft plans with `409 PLAN_NOT_EDITABLE`.<br>3. Saves user message in conversation.<br>4. Invokes `chat_agent.py`.<br>5. Validates budget split sum and dates, updates `Plan`, saves assistant message and returns audit changes. |
| `/api/plans/{id}` | `PUT` | Validates manual itinerary edits: full date range continuity from `start_date` to `end_date` without gaps, enum checks (`morning`/`afternoon`/`evening`, `hotel`/`food`/`activities`/`transport`), non-negative integer costs, and verifies that category costs do not exceed the category's budget split allocation. |
| `/api/trips` | `POST` | Enforces `409 PROFILE_REQUIRED` if the user has not completed the onboarding survey. Enforces `400 INVALID_CURRENCY` against supported currencies list. Calls the multi-tier agent generation pipeline. |
| `/api/ratings` | `POST` | Validates integer score 1 to 5 (`400 VALIDATION_ERROR`). Rejects draft plans with `409 RATING_NOT_ALLOWED`. Rejects duplicate ratings with `409 ALREADY_RATED`. Stores liked/disliked items into `user.profile` for future trip generation memory. |
| `/api/currencies` | `GET` | Returns list of 14 supported currencies. |
| `/api/currencies/default` | `GET` | Added for backward compatibility with contract auth table. |
| `/api/plans/{id}/chat` | `GET` | **Removed** non-contract endpoint. |

### Database Model Updates (`backend/app/models.py`)
- Added `search_context: Mapped[dict | None] = mapped_column(JSON, nullable=True)` to `Plan`.
- Database schema regenerated and initialized via `init_db.py`.

---

## 5. Frontend Enhancements & Fixes

### 5.1 Real Routing (`react-router-dom`)
Replaced state-variable routing with browser URL routing in `frontend/src/App.jsx`:
- `/`: Home page (sections reordered: Hero → What Ayn does 4 cards → About → CTA toggle).
- `/destination`: Trip creation form with city, dates, budget, currency, and travelers.
- `/plan/:id/options`: Stays & Flights selection screen (DESIGN §4.6 & §4.7).
- `/plan/:id`: Draft plan view with Day timeline cards, manual editing, Budget stacked bar, and Chat panel.
- `/plan/:id/confirmed`: Trip confirmed celebration screen with PDF & `.ics` export (DESIGN §5.4).
- `/plan/:id/rate`: Trip rating screen (DESIGN §5.5).
- `/trips`: My trips list with trip cards, rating status badge, and "Rate this trip" button.
- `/survey` & `/profile`: Onboarding & profile survey.
- `/components`: Dev-only components sandbox (`import.meta.env.DEV`).

### 5.2 Removal of Fake Data & Masking
- **`AuthContext.jsx`**: Removed hardcoded logged-in user "Sara". Fresh state starts unauthenticated; token stored in `localStorage` under `ayn_auth_token`.
- **`Destination.jsx`**: Removed automatic fallback redirect to `/plan/plan_001` on failure; surfaces real error.
- **`DraftPlan.jsx`**: Removed hardcoded `FALLBACK_PLAN` fallback; surfaces real server error.
- **`Trips.jsx`**: Removed hardcoded `DEFAULT_TRIPS` fallback; surfaces real error.

### 5.3 ChatPanel Component (`frontend/src/components/ChatPanel/ChatPanel.jsx`)
- Card titled *"Ask Ayn to change it"* with friendly person illustration.
- User bubble in primary blue aligned to the end; Ayn bubble in sky blue aligned to the start.
- Displays *"Updating your plan..."* and disables Send while awaiting response.
- Renders clarification questions naturally in chat without modifying plan.
- Handles `502 GENERATION_FAILED` by showing error under input while preserving user's text.
- Automatically hides on non-draft plans (`409`).

### 5.4 New Frontend Screens
1. **Generating Screen (`frontend/src/components/GeneratingScreen/GeneratingScreen.jsx`)**:
   - Centered card: H2 *"Building your plan"*, muted subtitle.
   - Thin 2px indeterminate progress bar in `--color-primary` at the top of the card.
   - Inline error display with *"Try again"* button on 502 failure.
2. **Options Screen (`frontend/src/pages/Options/Options.jsx`)**:
   - 3 Hotel Arch picture cards using `PictureCard` (arch image, stars, neighborhood, price per night & total price).
   - 2 Flight rows with airline, departure/arrival routes, and selection buttons.
   - Updates `selected_hotel_id` and `selected_flight_id` via `PUT /plans/{id}`.
3. **Confirmed Screen & Export (`frontend/src/pages/Confirmed/Confirmed.jsx`)**:
   - Sky hero with checkmark, destination name, and dates.
   - *"Save to phone"* button triggers formatted print/PDF generation.
   - *"Add to calendar"* button generates and downloads a standard `.ics` iCalendar file for all trip days and activities.
   - *"Rate your trip"* button linking to `/plan/:id/rate`.
4. **Rating Screen (`frontend/src/pages/Rating/Rating.jsx`)**:
   - Segmented 1 to 5 score selection.
   - Tag input for liked aspects (Enter adds chip, X removes chip, counter `(x/10)`).
   - Tag input for disliked aspects.
   - Notes textarea.
   - Calls `POST /ratings` and redirects to `/trips`.

---

## 6. How to Run the Application

### 1. Backend (FastAPI)
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Run tests:
```bash
cd backend
python -m pytest tests
```
*(All 104 tests pass)*

### 2. Frontend (Vite + React)
```bash
cd frontend
npm run dev
```
- Frontend UI: [http://localhost:5173](http://localhost:5173)
- Build for production:
```bash
cd frontend
npm run build
```
*(0 errors, builds in ~1.4s)*
