# 🛠️ Run Execution, Debugging, and Problem Resolution Log

This document provides a technical record of all execution steps, runtime issues encountered during agent implementation, the debugging methodologies applied, and the final verification results.

---

## 1. Summary of Execution Steps

1. **Virtual Environment Setup**:
   - Initialized Python venv (`python -m venv venv`).
   - Installed core dependencies (`crewai`, `groq`, `tavily-python`, `pydantic`, `python-dotenv`, `litellm`).

2. **Schema & Codebase Implementation**:
   - Built contract-accurate models in `agent/schemas.py` (`UserProfile`, `TripRequest`, `FinalPlanResponse`, `Options`, `Flight`, `Hotel`).
   - Created the 3-agent CrewAI pipeline (`context_agent`, `search_agent`, `planner_agent`).
   - Implemented the Tavily search tool wrapper (`tavily_tool.py`).
   - Created the fallback ladder (`direct_groq.py` for Tier 2, `mock_builder.py` for Tier 3).
   - Created the post-processing validator (`post_processor.py`) and automated test runner (`tests/validate_output.py`).

3. **Incremental Testing & Verification**:
   - Verified Tier 3 (Deterministic mock).
   - Verified Tier 2 (Direct Groq SDK completion).
   - Verified Tier 1 (CrewAI multi-agent with Tavily web search).
   - Executed the full automated test suite (8/8 checks passed).

---

## 2. Problems Encountered & Solutions

### Problem 1: Windows Console Unicode / Charmap Encoding Failure
- **Symptom**:
  Running CLI entry points crashed with:
  `UnicodeEncodeError: 'charmap' codec can't encode character '\u2705' in position 0: character maps to <undefined>`.
- **Root Cause**:
  On Windows, default standard streams (`sys.stdout`, `sys.stderr`) often use legacy code pages (CP1252/Charmap), which fail when attempting to print modern Unicode checkmark and cross symbols (`✅`, `❌`).
- **Solution**:
  Configured stream re-encoding at the entry points of `agent/main.py` and `tests/validate_output.py`:
  ```python
  if sys.platform == "win32":
      sys.stdout.reconfigure(encoding="utf-8")
      sys.stderr.reconfigure(encoding="utf-8")
  ```

---

### Problem 2: Groq Model 404 (`llama-3.3-70b-versatile` Not Available)
- **Symptom**:
  Calling Groq failed with:
  `groq.NotFoundError: Error code: 404 - The model llama-3.3-70b-versatile does not exist or you do not have access to it`.
- **Root Cause**:
  The specified model ID was unavailable or renamed on the user's Groq tier.
- **Diagnosis**:
  Queried the Groq API dynamically via `client.models.list()` to inspect available chat models for the API key. Discovered accessible active models:
  - `qwen/qwen3.8-27b`
  - `openai/gpt-oss-120b`
- **Solution**:
  Refactored `agent/llm_config.py` and `agent/fallbacks/direct_groq.py` to use an environment variable `GROQ_MODEL`, defaulting to `qwen/qwen3.8-27b`. Added configuration instructions in `.env.example`.

---

### Problem 3: Missing LiteLLM Provider in CrewAI
- **Symptom**:
  CrewAI failed on startup with:
  `ImportError: Unable to initialize LLM with model 'groq/...'. The model did not match any supported native provider ... and the LiteLLM fallback package is not installed`.
- **Root Cause**:
  CrewAI delegates non-native provider strings (like `groq/...`) to `litellm`, which was not bundled in the minimal installation.
- **Solution**:
  Installed `litellm>=1.40.0` into the virtual environment and added it to `requirements.txt`.

---

### Problem 4: Groq Rejection of Prompt Caching (`cache_breakpoint`)
- **Symptom**:
  CrewAI requests failed with:
  `litellm.exceptions.BadRequestError: GroqException - {"error":{"message":"'messages.0' : for 'role:system' the following must be satisfied[('messages.0' : property 'cache_breakpoint' is unsupported)]"}}`.
- **Root Cause**:
  CrewAI automatically injects prompt-caching metadata (`cache_breakpoint`, `cache_control`) into system messages for LiteLLM. Groq's API rejects unrecognized properties inside message objects.
- **Solution**:
  1. Enabled `litellm.drop_params = True`.
  2. Monkey-patched `litellm.completion` in `agent/llm_config.py` to recursively strip `cache_breakpoint` and `cache_control` from message dictionaries before passing them to the Groq API:
     ```python
     def _clean_msgs(msgs):
         if isinstance(msgs, list):
             for m in msgs:
                 if isinstance(m, dict):
                     m.pop("cache_breakpoint", None)
                     m.pop("cache_control", None)
     ```

---

### Problem 5: Instructor Tool Choice Coercion vs Direct JSON
- **Symptom**:
  Task execution failed with:
  `Tool choice is required, but model did not call a tool` or `attempted to call tool 'agent_output' which was not in request.tools`.
- **Root Cause**:
  Setting `output_json=PydanticModel` on a CrewAI `Task` triggers Instructor's tool-call mode (`tool_choice="required"`). Open-weight models on Groq frequently output direct JSON in content rather than formatting a function tool call, leading to API validation failures.
- **Solution**:
  - Removed `output_json` from CrewAI task definitions and instructed the LLM via prompt engineering to emit clean JSON directly.
  - Implemented robust JSON parsing in `agent/main.py` using markdown fence extraction and `json_repair` fallback:
    ```python
    cleaned = raw_text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    raw = json.loads(cleaned)
    return FinalPlanResponse.model_validate(raw)
    ```

---

### Problem 6: Groq Rate Limits (ITPM & OTPM Constraints)
- **Symptom**:
  Groq API returned HTTP 429:
  - `Input tokens per minute (ITPM): Limit 7000, Used 4828, Requested 3016`.
  - `Output tokens per minute (OTPM): Limit 1000, Requested 2000`.
- **Root Cause**:
  - `max_tokens` was initially set to 8000, causing Groq's scheduler to calculate expected output tokens against the minute limit and reject the request.
  - Verbose tool outputs (5 search results with long snippets) filled up the input context.
- **Solution**:
  1. Reduced `max_tokens` to `1,000` in `llm_config.py` and `direct_groq.py` (sufficient for a 3-day itinerary while strictly fitting under the 1,000 OTPM ceiling).
  2. Reduced search snippet size to 120 characters and max results to 3.
  3. Added prompt guidelines requiring single-sentence activity descriptions and zero conversational filler.

---

### Problem 7: Unbounded Search Agent Iterations
- **Symptom**:
  Agent 2 executed 5+ redundant searches (`Execution Started (#5)`), burning through API search quotas and input tokens.
- **Root Cause**:
  Without an explicit iteration or invocation cap, the autonomous agent kept querying for slight variations of places.
- **Solution**:
  - Configured `max_iter=3` on `create_search_agent()` in `agent/agents/search_agent.py`.
  - Added a hard search query counter in `agent/tools/tavily_tool.py`:
    ```python
    MAX_SEARCH_QUERIES = 2
    if _search_counter >= MAX_SEARCH_QUERIES:
        return "Search query limit reached. Do NOT perform any more searches. Immediately construct and output your final verified_places JSON."
    ```
  - Added `reset_search_counter()` at the beginning of every pipeline execution.

---

### Problem 8: Strict Rejection of Unknown Survey Enum Values
- **Requirement**:
  Ensure the agent layer strictly rejects invalid survey entries rather than silently accepting free-text.
- **Solution**:
  - Formulated `PersonalityEnum`, `HobbiesEnum`, and `DietaryLimitsEnum` as closed Pydantic `Literal` types.
  - Added explicit upfront model validation in `agent/main.py`:
    ```python
    validated_profile = UserProfile.model_validate(raw_profile)
    validated_trip = TripRequest.model_validate(raw_trip)
    ```
    If invalid entries are supplied, a Pydantic `ValidationError` is raised immediately before LLM invocation.

---

## 3. Final Verification Results

### Test 1: Full Automated Test Suite
Ran `python -m tests.validate_output output/plan_output.json`:
```text
============================================================
  Validating: plan_output.json
============================================================

  ✅  schema_valid         — Schema validation passed
  ✅  budget_sum           — Budget sum correct: 60000 == 60000
  ✅  integer_costs        — All costs are integers
  ✅  date_coverage        — Date coverage correct: 3 days
  ✅  enum_timeslots       — All time_slots valid
  ✅  enum_categories      — All categories valid
  ✅  hotel_cost_zero      — Hotel activities have cost 0
  ✅  no_dislikes          — No dislikes found (very spicy food)

============================================================
  ✅ ALL CHECKS PASSED
============================================================
```

### Test 2: Fallback Ladder Resilience
- **Tier 1 (CrewAI Pipeline)**: Successfully coordinated 3 agents and Tavily web searches to produce a verified plan.
- **Tier 2 (Direct Groq SDK)**: Successfully tested via `python -m agent.main --tier 2`, producing a valid plan in ~5 seconds.
- **Tier 3 (Deterministic Mock)**: Successfully tested via `python -m agent.main --tier 3`, ensuring offline 100% availability.
