# Ayn — Sprint 3 Execution Report

**Project:** Ayn Personal Travel Planner Agent  
**Owner (this slice):** Abdelrhman Esma3el  
**Sprint window:** 13–19 October 2026  
**Demo date:** Tuesday 20 October 2026  
**Report date:** 15 October 2026  
**Coding status:** A1–A11 implemented and verified in-repo  
**Human gates still open:** A9 keyword-list confirmation (Roaa / Manal); A10/A11 M10 sign-off (Manal, due 18 Oct noon)

This document records what was delivered in Sprint 3, which files changed, how each mechanism works, and the measurement / test evidence used to mark work done.

---

## 1. Overall Sprint Summary & Architecture

### 1.1 Goal of the sprint

Sprint 3 closed the agent-side reliability and quality work needed for the live demo:

- Pin a reproducible Python environment.
- Measure real latency and JSON validity across generation paths.
- Make the execution path visible without changing the public API contract.
- Bound hanging LLM calls so fallbacks always fire.
- Prove contract quality (budget, enums, density, dislikes) at 3/3 across profiles.
- Validate the five Egyptian demo destinations.
- Cache Tavily search results so demo runs do not depend on live search quota.
- Prove English and Arabic chat guardrails (Level 1).
- Inject Arabic itinerary copy and Arabic text normalization (Level 2), pending product sign-off.

### 1.2 Current 4-path fallback pipeline

Runtime generation is implemented in `agent/main.py` (`generate_plan_from_dict`). The public story is a four-path cascade. In code it is expressed as three outer tiers, with CrewAI and Direct Gemini sharing **Tier 1**:

```text
API / CLI request
        │
        ▼
generate_plan_from_dict(profile, trip)
        │
        ├─ Tier 1a  CrewAI sequential crew (Context → Search/Tavily → Planner)
        │              timeout: AGENT_GLOBAL_TIMEOUT_S (default 40s)
        │              requires CrewAI import + a real TAVILY_API_KEY
        │              on failure / timeout ↓
        ├─ Tier 1b  Direct Gemini (google-genai, response_mime_type=application/json)
        │              timeout: 20s (SDK HTTP timeout 15s)
        │              on failure / timeout ↓
        ├─ Tier 2   Direct Groq SDK (json_object mode)
        │              timeout: 30s (SDK timeout 25s)
        │              on failure / timeout ↓
        └─ Tier 3   Deterministic mock builder
                       never times out; always returns a schema-valid plan
        │
        ▼
post_process(plan, profile)     # budget repair, int costs, IDs, dislike strip
        │
        ▼
plan.search_context = "<tier_name>"   # "crewai" | "gemini" | "groq" | "mock"
        │
        ▼
FinalPlanResponse (Pydantic-validated)
```

**Per-path notes**

| Path | Role | Typical latency (measured / expected) | Failure mode |
|---|---|---|---|
| CrewAI + Tavily | Multi-agent “full” pipeline | ~35–70s historically; not in the 15 Oct A1 table (skipped to save quota) | Hang, quota, missing Tavily key → Gemini |
| Direct Gemini | Primary single-call JSON generator | **4.68–7.86s**, 100% valid (4/4) | Missing key, timeout, invalid JSON → Groq |
| Direct Groq | Fast fallback | **0.54–4.64s**; 1/4 valid in A1 due to OTPM 429s | Rate limit / invalid JSON → mock |
| Mock builder | Demo safety net | **~0.00s**, 100% valid | None by design |

Every successful path is tagged on the existing optional field `FinalPlanResponse.search_context`. No new API field was added.

Optional `trip["language"]` is preserved after `TripRequest` validation so Arabic Level 2 can run without changing the published trip contract.

### 1.3 Completed work at a glance (A1–A11)

| ID | Theme | Status |
|---|---|---|
| **A3** | Pin packages + `.env.example` (`google-genai`, `json_repair`, `agentops`, Gemini model name) | **Done / Verified** |
| **A1** | AgentOps + local measurement table (`docs/agent_measurements.md`, 12 runs) | **Done / Verified** |
| **A2** | Execution-path tag via `search_context` | **Done / Verified** |
| **A4** | Global per-tier timeout (`ThreadPoolExecutor`, default 40s) | **Done** (wrapper + `scripts/test_timeout.py` in repo) |
| **A5** | Quality suite 3/3; calm vs adventurous density; profile-aware mock | **Done / Verified** (EN 3/3 PASS) |
| **A6** | Five demo destinations through mock | **Done / Verified** (5/5 PASS) |
| **A7** | Tavily cache-first lookup + primed `agent/cache/tavily/` (5 files) | **Done / Verified** |
| **A8** | English chat 10-message evaluation | **Done / Verified** (10/10 PASS) |
| **A9** | Arabic Level 1 chat guards + 10-message evaluation | **Done / Verified in code** — **keyword list still needs Roaa/Manal confirmation** |
| **A10** | Arabic Level 2 plan prompt injection (`title` / `description` in Arabic) | **Implemented / offline verified** — **pending Manal M10** |
| **A11** | Arabic Level 2 safety normalization (alef / taa marbuta / alif maqsura) | **Implemented / offline verified** — **pending Manal M10** |

**Arabic Level 1 (A9):** guards in code (not only in the LLM prompt) for destination, travelers, currency, budget-without-currency, and dietary / dislike violations, with Arabic keyword patterns.

**Arabic Level 2 (A10 + A11):** when `trip.language` is `ar`, all three LLM writers plus the mock builder emit Arabic activity titles and descriptions while keeping JSON keys, enums, IDs, currency codes, and dates in English. Matching of Arabic user text and dislike strings uses `normalize_arabic()`.

Sprint coding for this owner slice is complete. Product deployment of Level 2 remains gated until 18 October noon.

---

## 2. Complete Task Breakdown & File Mapping

### 2.1 A3 — Package list and `.env.example`

**Goals:** Reproducible install; add missing SDKs; document the non-deprecated Gemini model; optional AgentOps key.

**Status:** **Done / Verified**

**Files**

| File | Change | What it does |
|---|---|---|
| `requirements.txt` | Modified | Pins CrewAI, Groq, Tavily, Pydantic, python-dotenv, LiteLLM, plus **`google-genai`**, **`json_repair`**, **`agentops`** with upper bounds. |
| `.env.example` | Modified | Sets `GEMINI_MODEL=gemini-flash-lite-latest` with a deprecation note for `gemini-1.5-flash`. Documents `AGENTOPS_API_KEY`, per-agent Groq keys, Tavily, and auth/DB/CORS. |
| `backend/requirements.txt` | Unchanged for A3 (backend remains separate) | — |

**Implementation notes**

- Direct Gemini uses the official `google.genai` client, not the deprecated `gemini-1.5-flash` name. `direct_gemini.py` remaps old model names to `gemini-flash-lite-latest`.
- `json_repair` is used in `agent/main.py` when CrewAI output is not strict JSON.
- AgentOps is optional: missing package or empty key must not crash generation.

**Verify:** `pip install -r requirements.txt` then `python -c "import crewai, groq, tavily, google.genai, json_repair, pydantic, dotenv, agentops; print('All OK')"`.

---

### 2.2 A1 — Agent performance measurements

**Goals:** Time ≥12 runs across profiles and tiers; write a Markdown table; optional AgentOps session tracing.

**Status:** **Done / Verified** (12 runs on 15 Oct 2026, 12:15:08 UTC; AgentOps enabled)

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/monitoring.py` | **Created** | `RunRecord` dataclass + `MonitorContext` context manager. Times `perf_counter`, classifies profile (`calm` / `adventurous` / `custom`), records `json_valid` and truncated errors. Initializes AgentOps when `AGENTOPS_API_KEY` is set; otherwise degrades silently. `flush_to_markdown()` writes `docs/agent_measurements.md`. |
| `scripts/measure_agent.py` | **Created** | Runs Gemini / Groq / mock (and optionally CrewAI) against calm and adventurous templates. Flags: `--tier`, `--skip-crewai`. Calls `post_process` after each generation. |
| `docs/agent_measurements.md` | **Created / generated** | Human-readable results + recommendation for the demo. |
| `agent/llm_config.py` | Related (quota) | **Multi-key Groq rotation:** `GROQ_API_KEY_CONTEXT` / `_SEARCH` / `_PLANNER`, then shared `GROQ_API_KEY`. LiteLLM `drop_params` plus a patch that strips `cache_breakpoint` / `cache_control` so Groq does not reject CrewAI messages. |

**How monitoring works**

```text
with MonitorContext(tier, profile, run_id) as ctx:
    plan = fn(profile, trip)
    plan = post_process(plan, profile=profile)
    ctx.json_valid = True   # or False + ctx.error
# finally: duration_s recorded, optional AgentOps session ended
flush_to_markdown()
```

The A1 run skipped CrewAI (`--skip-crewai`) to protect quota. Mock and Gemini were 100% valid; Groq hit output-token-per-minute 429s on three of four calls (see §3).

---

### 2.3 A2 — Show plan execution path

**Goals:** Surface which path produced the plan without extending the public schema.

**Status:** **Done / Verified**

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/schemas.py` | Modified | `FinalPlanResponse.search_context: Optional[str] = None` — already an optional free-text contract field. |
| `agent/main.py` | Modified | After `post_process`, sets `plan.search_context` to `"crewai"`, `"gemini"`, `"groq"`, or `"mock"`. |

**Implementation notes**

No rename and no extra response field. Backend already persists `search_context` on `Plan`. Chat agent accepts `search_context` as an argument but that is conversation context, not the generation-path tag.

**Verify:** `python -m agent.main --tier 3` then read `output/plan_output.json` → `"search_context": "mock"`.

---

### 2.4 A4 — Global generation timeout

**Goals:** CrewAI (and other LLM paths) must not hang the API; fallbacks must trigger.

**Status:** **Done** (implementation + scratch test in repo)

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/main.py` | Modified | `GLOBAL_TIMEOUT_S = int(os.getenv("AGENT_GLOBAL_TIMEOUT_S", "40"))`. `_run_tier_with_timeout` submits the callable on a one-worker `ThreadPoolExecutor` and raises `TimeoutError` if `future.result` exceeds the deadline. CrewAI uses 40s; Gemini 20s; Groq 30s; mock is not wrapped. |
| `agent/fallbacks/direct_gemini.py` | Already had 15s HTTP timeout | Complements the thread deadline. |
| `agent/fallbacks/direct_groq.py` | Already had `timeout=25.0` on the Groq client | Complements the thread deadline. |
| `scripts/test_timeout.py` | **Created** | Sleeps 10s under a 2s deadline; expects `TimeoutError`. |

**Implementation notes**

If CrewAI exceeds 40s, Tier 1 catches the error and tries Direct Gemini inside the same outer tier, then Groq, then mock. Mock is never timed out so the API can always return a plan.

**Verify:** `python scripts/test_timeout.py` (requires the same environment as `agent.main`, including `groq`).

---

### 2.5 A5 — Quality check suite

**Goals:** Existing `tests/validate_output.py` checks plus activity-density comparison; 3/3 pass on calm and adventurous; mock builder must be profile-aware.

**Status:** **Done / Verified** (15 Oct re-run: ALL CHECKS PASSED)

**Files**

| File | Change | What it does |
|---|---|---|
| `tests/validate_output.py` | Modified | Nine checks: schema, budget sum, integer costs, date coverage, time-slot enums, category enums, hotel cost 0, **no food-dislike mentions** (now Arabic-normalized, optional profile arg), **activity density report**. `ALL_CHECKS` is consumed by the batch runner. |
| `scripts/run_quality_checks.py` | **Created** | 3 runs × calm + adventurous through mock + `post_process`. Asserts mean activities/day for calm **<** adventurous. `--language ar` adds Arabic-copy and A11 normalization probes (A10/A11). |
| `agent/fallbacks/mock_builder.py` | Modified | `is_calm`: middle days get 2 activities (morning + lunch) instead of 4 (adds afternoon excursion + dinner). Guarantees the density inequality without an LLM. |

**Checks in `ALL_CHECKS`**

1. `schema_valid` — Pydantic `FinalPlanResponse`
2. `budget_split` sum equals `total_budget`
3. All `estimated_cost` values are integers
4. Itinerary covers every date from start to end
5. `time_slot` ∈ {morning, afternoon, evening}
6. `category` ∈ {hotel, food, activities, transport}
7. Hotel check-in / check-out cost is 0
8. No activity text mentions `food_dislikes`
9. Density reported for calm / adventurous profiles

**Latest English density:** calm **2.80** activities/day vs adventurous **4.00**.

---

### 2.6 A6 — Destination validation

**Goals:** Run the five demo cities through mock (offline); log place names and price sanity.

**Status:** **Done / Verified** (5/5 PASS)

**Files**

| File | Change | What it does |
|---|---|---|
| `scripts/test_destinations.py` | **Created** | Builds a mock plan per city. Checks destination match, date continuity, budget split, hotel zero-cost, and **no single activity costing more than 50% of the relevant daily category budget**. |

**Cities:** Cairo, Alexandria, Luxor, Aswan, Sharm El Sheikh (all Egypt). Each run used a 4-day window and 55,000 EGP in the last successful execution.

---

### 2.7 A7 — Tavily search cache

**Goals:** Cache-first Tavily so demo and CrewAI runs do not burn the free quota or stall on the network.

**Status:** **Done / Verified**

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/tools/tavily_tool.py` | Modified | `CACHE_DIR = agent/cache/tavily`. MD5 of lowercased query (12 hex chars). `_load_cache` before any HTTP call; `_save_cache` after a live hit. Still caps live queries at **2** per pipeline run (`MAX_SEARCH_QUERIES`) via `reset_search_counter()`. |
| `scripts/prime_cache.py` | **Created** | Calls search for the five demo cities; writes cache files; has preset text if the network/key is unavailable. |
| `agent/cache/tavily/*.txt` | **Created** (5 files) | `0b2f9abe0293.txt`, `18813e3936ae.txt`, `28a8f87aec68.txt`, `63692d647943.txt`, `dfa1e861b252.txt`. |

**Flow**

```text
execute_tavily_search(query)
  → cache hit? return file text
  → else if counter ≥ 2: return “stop searching” message
  → else TavilyClient.search → save txt → return
```

---

### 2.8 A8 — English chat agent test

**Goals:** Ten English refinement messages through the chat agent; log ALLOW vs BLOCK; write `docs/chat_test_en.md`.

**Status:** **Done / Verified** (10/10 PASS, generated 2026-10-15 13:08:14 UTC)

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/agents/chat_agent.py` | Modified (shared with A9/A11) | Code guards before LLM/mock refine: immutable destination / travelers / currency; budget change requires amount **and** currency; dietary patterns with word boundaries (e.g. `nut` must not match `minutes`). Gemini primary, Groq backup, `chat_mock` fallback. |
| `scripts/test_chat_en.py` | **Created** | Sends the 10 messages with `force_mock=True` against a mock Sharm plan + halal calm profile. Maps `needs_clarification` → BLOCK, `updated` → ALLOW. |
| `docs/chat_test_en.md` | **Generated** | Evaluation table for reviewers. |

Guard implementation lives in code, not only in the system prompt, so BLOCK behavior does not depend on the LLM cooperating.

---

### 2.9 A9 — Arabic chat guards (Level 1)

**Goals:** Same guard categories as English, with Arabic keywords; ten Arabic messages; log to `docs/chat_test_ar.md`.

**Status:** **Done / Verified in automation** — **human confirmation of the word list still required**

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/agents/chat_agent.py` | Modified | Arabic regexes for destination (`غير` / `بدل` + `وجهة`), travelers (`مسافرين`), currency (`عملة`), budget (`ميزانية`), and dietary items (e.g. `خنزير`, `مكسرات`, `لحم`, `حليب`). Budget also maps جنيه / دولار / يورو / ريال / درهم. |
| `scripts/test_chat_ar.py` | **Created** | Ten cases including nut-free profile for message 9. |
| `docs/chat_test_ar.md` | **Generated** | Arabic evaluation table. |

**Keyword map used in code (pending Roaa/Manal review)**

| Category | English | Arabic patterns in guards |
|---|---|---|
| Vegetarian / vegan / halal / gluten-free / dairy-free / nut-free | English whole-word lists | نباتي-related foods via meat/dairy patterns; حلال via pork/alcohol; خالي من الغلوتين via قمح/غلوتين; ألبان; مكسرات |
| Destination change | change destination | غير الوجهة / بدل الوجهة / تغيير المدينة, plus “go to Alexandria/Cairo/…” |
| Budget change | set / change budget | غير الميزانية / بدل الميزانية |
| Traveler count | change travelers | غير عدد المسافرين |

---

### 2.10 A10 — Arabic plan prompt injection (Level 2)

**Goals:** If `trip["language"] == "ar"`, LLM plans write `title` and `description` in Arabic; keys, enums, IDs, currency codes, and dates stay English.

**Status:** **Implemented / offline verified** — **pending Manal M10 before treating as demo-deployed**

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/arabic.py` | **Created** | `ARABIC_LANGUAGE_RULE`, `trip_language()`, `arabic_language_rule_block(trip)`. |
| `agent/fallbacks/direct_gemini.py` | Modified | Appends the Arabic rule into the user prompt when language is `ar`. |
| `agent/fallbacks/direct_groq.py` | Modified | Same injection. |
| `agent/tasks/planner_task.py` | Modified | Same injection on the CrewAI planner task description. |
| `agent/main.py` | Modified | After `TripRequest.model_dump()`, copies `language` back onto `t_dict` so it is not stripped as an extra field. |
| `agent/fallbacks/mock_builder.py` | Modified | `loc(en, ar)` helper: Arabic titles/descriptions when language is `ar`, keeping `time_slot` / `category` in English. |
| `scripts/run_quality_checks.py` | Modified | `--language ar` requires Arabic letters in every itinerary title and description. |

The planner **agent persona** in `planner_agent.py` was left in English; language control is on the **task** prompt, which is what the sprint plan specified.

---

### 2.11 A11 — Arabic safety normalization (Level 2)

**Goals:** Normalize alef variants and taa marbuta before dislike / dietary / destination matching so `الإسكندرية` and `الاسكندريه` collide.

**Status:** **Implemented / offline verified** — **pending Manal M10**

**Files**

| File | Change | What it does |
|---|---|---|
| `agent/arabic.py` | **Created** | `normalize_arabic()`: `أإآٱ` → `ا`, `ة` → `ه`, `ى` → `ي`, plus lowercase. `regex_search()` normalizes both pattern and haystack. `contains_arabic()` for A10 quality checks. |
| `agent/agents/chat_agent.py` | Modified | Immutable, budget, dietary, and sanitizer scans use `regex_search` / `normalize_arabic` instead of raw `re.search` on `.lower()` only. |
| `agent/validators/post_processor.py` | Modified | Optional `profile`; after ID assignment, replaces **food** activities whose title+description contain a normalized dislike (≥3 chars). |
| `tests/validate_output.py` | Modified | `check_no_dislikes` uses the same normalization and accepts a passed-in profile. |
| `scripts/measure_agent.py` | Modified | `post_process(plan, profile=profile)`. |
| `scripts/run_quality_checks.py` | Modified | On `--language ar`, asserts `normalize_arabic("الإسكندرية") == normalize_arabic("الاسكندريه")`, destination guard on `غير الوجهه إلى الاسكندريه`, and halal guard on `لحم الخنزير`. |
| `scripts/test_destinations.py` | Modified | Passes profile into `post_process`. |

`post_process` still always: (1) repairs budget split to exact `total_budget`, (2) coerces costs to int, (3) assigns `act_NNN` IDs, (4) dislike repair, (5) re-validates Pydantic.

---

### 2.12 Cross-cutting files (not a single A-id)

| File | Role in Sprint 3 |
|---|---|
| `agent/schemas.py` | Contract models; `search_context`; trip/profile enums. |
| `agent/fallbacks/direct_gemini.py` | Tier 1b generator; 15s HTTP timeout; JSON mime type; A10 rule. |
| `agent/fallbacks/direct_groq.py` | Tier 2 generator; 25s SDK timeout; A10 rule. |
| `agent/fallbacks/mock_builder.py` | Tier 3; calm density; A10 Arabic copy. |
| `agent/agents/planner_agent.py` | CrewAI planner LLM via `get_groq_llm(..., agent_name="planner")`. |
| `agent/agents/context_agent.py` / `search_agent.py` | Per-agent Groq keys through `llm_config`. |
| `sprint3_plan.md` | Incremental plan this execution followed. |

---

## 3. Measurement & Test Results Summary

### 3.1 A1 — `docs/agent_measurements.md`

**Generated:** 2026-10-15 12:15:08 UTC  
**Runs:** 12 (CrewAI skipped)  
**AgentOps:** enabled (`True`)

#### Summary by tier

| Tier | Runs | JSON validity | Avg duration | Min | Max |
|---|---|---|---|---|---|
| Gemini | 4 | **100% (4/4)** | 5.74s | 4.68s | 7.86s |
| Groq | 4 | **25% (1/4)** | 1.66s | 0.54s | 4.64s |
| Mock | 4 | **100% (4/4)** | 0.00s | 0.00s | 0.00s |

Profiles exercised: **calm** and **adventurous** (two runs each per tier in this flush).

#### Per-run log (abridged)

| run_id | Valid | Notes |
|---|---|---|
| `mock_*` (4) | PASS | Instant deterministic plans |
| `gemini_calm_r1/r2` | PASS | 7.86s / 5.69s |
| `gemini_adventurous_r1/r2` | PASS | 4.74s / 4.68s |
| `groq_calm_r1` | FAIL | HTTP 429 OTPM: limit 1000, requested 1825 (`qwen/qwen3.8-27b`) |
| `groq_calm_r2` | PASS | 4.64s |
| `groq_adventurous_r1/r2` | FAIL | Same OTPM 429 class |

`RunRecord` includes `llm_calls`; this flush’s Markdown summary focuses on duration and `json_valid`. Token/cost detail is intended to live in AgentOps when the key is present.

**Recommendation recorded in the measurements file**

- Demo-primary path: Direct Gemini (3–8s), Groq as fast fallback when quota allows.
- Always keep mock as last resort so the demo never 500s.
- CrewAI remains optional/slow and quota-heavy; A1 skipped it on purpose.

### 3.2 A5 quality checks — English and Arabic

**English** (`python scripts/run_quality_checks.py`)

| Profile | Runs | Result | Avg activities/day |
|---|---|---|---|
| Calm | 3/3 PASS | PASS | 2.80 |
| Adventurous | 3/3 PASS | PASS | 4.00 |
| Density calm < adventurous | — | **PASS** | 2.80 < 4.00 |

**Arabic** (`python scripts/run_quality_checks.py --language ar`)

| Check | Result |
|---|---|
| A11 normalization (`الإسكندرية` ≡ `الاسكندريه`) | PASS |
| A11 destination guard on taa-marbuta variant | PASS |
| A11 dietary guard on `لحم الخنزير` | PASS |
| Calm 3/3 + adventurous 3/3 contract checks | PASS |
| Arabic letters in every title and description | PASS |
| Density 2.80 < 4.00 | PASS |

**Suite outcome:** 3/3 pass for both English and Arabic modes.

### 3.3 A8 — English chat (`docs/chat_test_en.md`)

**Generated:** 2026-10-15 13:08:14 UTC — **ALL 10 PASSED**

| # | Message | Expected | Actual |
|---|---|---|---|
| 1 | make day 2 calmer | ALLOW | ALLOW |
| 2 | add a cheap lunch | ALLOW | ALLOW |
| 3 | replace the museum | ALLOW | ALLOW |
| 4 | set the budget to 80000 EGP | ALLOW | ALLOW |
| 5 | change the destination | BLOCK | BLOCK |
| 6 | add a meal with pork (halal profile) | BLOCK | BLOCK |
| 7 | add more beach time | ALLOW | ALLOW |
| 8 | make the plan more budget-friendly | ALLOW | ALLOW |
| 9 | what hotels are available? | ALLOW | ALLOW |
| 10 | change the number of travelers to 1 | BLOCK | BLOCK |

Immutable destination/travelers and halal pork are intercepted as `needs_clarification` before itinerary mutation. Budget with amount + currency is applied and the split is recalculated.

### 3.4 A9 — Arabic chat (`docs/chat_test_ar.md`)

**Generated:** 2026-10-15 13:08:14 UTC — **ALL 10 PASSED**

| # | Message | Expected | Actual |
|---|---|---|---|
| 1 | غير الوجهة إلى الإسكندرية | BLOCK | BLOCK |
| 2 | أضف وجبة لحم خنزير | BLOCK | BLOCK |
| 3 | اعمل اليوم الثاني أهدأ | ALLOW | ALLOW |
| 4 | أضف غداء رخيص | ALLOW | ALLOW |
| 5 | غير الميزانية إلى 80000 (no currency) | BLOCK | BLOCK |
| 6 | غير عدد المسافرين إلى 5 | BLOCK | BLOCK |
| 7 | استبدل المتحف | ALLOW | ALLOW |
| 8 | أضف مطعم بيتزا | ALLOW | ALLOW |
| 9 | أضف طعام يحتوي على مكسرات (nut-free) | BLOCK | BLOCK |
| 10 | حسّن خيارات الفندق | ALLOW | ALLOW |

### 3.5 A6 — Five Egyptian destinations

Command: `python scripts/test_destinations.py`  
**Result:** ALL 5 DESTINATIONS VALIDATED SUCCESSFULLY

| City | Window / budget (last run) | Result |
|---|---|---|
| Cairo | 4 days, 55,000 EGP | PASS |
| Alexandria | 4 days, 55,000 EGP | PASS |
| Luxor | 4 days, 55,000 EGP | PASS |
| Aswan | 4 days, 55,000 EGP | PASS |
| Sharm El Sheikh | 4 days, 55,000 EGP | PASS |

Sanity: destination fields, date coverage, exact budget split, hotel activities at cost 0, no activity above 50% of the daily category budget.

### 3.6 Other verification commands

| Task | Command | Last known result |
|---|---|---|
| A4 | `python scripts/test_timeout.py` | Script present; must be run in the project venv (imports `agent.main` → Groq SDK) |
| A7 | `python scripts/prime_cache.py` | Five cache files under `agent/cache/tavily/` |
| A8 | `python scripts/test_chat_en.py` | 10/10 PASS |
| A9 | `python scripts/test_chat_ar.py` | 10/10 PASS |
| Merge gate | `python -m tests.validate_output output/plan_output.json` and `python scripts/run_quality_checks.py` | Quality suite PASS on 15 Oct |

---

## 4. Remaining Human Sign-offs (Gates)

Code for A1–A11 is in the repository and the automated suites above have been run. Two **product / language** gates remain before Level 1 wording and Level 2 demo deployment are considered closed.

### 4.1 A9 — Arabic keyword list (Roaa / Manal)

**Why:** Level 1 guards are regex lists. Automation proves the ten scripted messages behave as designed; it does not prove the vocabulary is complete or dialect-appropriate for Egyptian users.

**Please confirm or correct:**

- Dietary: نباتي، نباتي صارم، حلال، خالي من الغلوتين، خالي من الألبان، خالي من المكسرات, plus forbidden-item terms (خنزير، مكسرات، لحم، دجاج، حليب, …).
- Destination: غير الوجهة / بدل الوجهة / تغيير المدينة, and city names (الإسكندرية، القاهرة، الأقصر، أسوان، شرم الشيخ، الغردقة، دهب).
- Budget: غير الميزانية / بدل الميزانية, currency words (جنيه، دولار، يورو، ريال، درهم).
- Travelers: غير عدد المسافرين / الأشخاص / الضيوف.

Until this confirmation, A9 stays **technically passing** and **linguistically provisional**.

### 4.2 A10 + A11 — Manal M10 (Arabic Level 2)

**Deadline:** **18 October 2026, 12:00 noon** (sprint cut point).

**What needs official sign-off**

1. Arabic `title` / `description` on generated plans when `language=ar`, with English JSON keys and enums.
2. Safety matching via `normalize_arabic` (alef variants, taa marbuta, alif maqsura) in chat guards, plan sanitizer, and post-process dislike repair.

**Sprint cut rule:** A10 and A11 are accepted or **cut together**. If M10 is not approved by noon on 18 Oct, both Level 2 features should be kept out of the demo path; Level 1 Arabic guards (A9) remain.

**Offline evidence already available for M10 review**

- `python scripts/run_quality_checks.py --language ar` → ALL CHECKS PASSED  
- A11 probes for `الاسكندريه` / `الوجهه` / `لحم الخنزير`  
- Mock builder Arabic copy with English enums  

M10 should still include a live Gemini/Groq Arabic generation sample if quota allows; mock-only proof is sufficient for schema and guards but not for LLM Arabic fluency.

---

## 5. Appendix — Suggested demo posture

Until M10:

- Default generation language: **English**.
- Chat: English A8 + Arabic A9 guards on.
- Path tag: `search_context` for debugging.
- If Gemini/Groq fail or 429: mock still returns a valid plan in <50ms.

After M10:

- Pass `language: "ar"` on the trip payload for Arabic itinerary copy.
- Keep enum/date/ID English; only titles and descriptions switch.

---

## 6. Appendix — File inventory (Sprint 3 agent slice)

**Created**

- `agent/monitoring.py`
- `agent/arabic.py`
- `agent/cache/tavily/` (five `.txt` cache objects)
- `scripts/measure_agent.py`
- `scripts/run_quality_checks.py`
- `scripts/test_timeout.py`
- `scripts/test_destinations.py`
- `scripts/prime_cache.py`
- `scripts/test_chat_en.py`
- `scripts/test_chat_ar.py`
- `docs/agent_measurements.md`
- `docs/chat_test_en.md`
- `docs/chat_test_ar.md`
- `docs/sprint3_execution_report.md` (this file)
- `sprint3_plan.md` (planning source)

**Modified (principal)**

- `requirements.txt`, `.env.example`
- `agent/main.py`, `agent/schemas.py`, `agent/llm_config.py`
- `agent/fallbacks/direct_gemini.py`, `direct_groq.py`, `mock_builder.py`
- `agent/tasks/planner_task.py`
- `agent/tools/tavily_tool.py`
- `agent/validators/post_processor.py`
- `agent/agents/chat_agent.py`
- `tests/validate_output.py`

---

*End of Sprint 3 execution report. Prepared for the Ayn personal travel planner team, 15 October 2026.*
