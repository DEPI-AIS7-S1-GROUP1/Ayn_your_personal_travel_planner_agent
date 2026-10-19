"""Run Task 6 (A9) Arabic Chat Guardrail evaluation on 10 Arabic test messages.

Usage:
    python scripts/test_chat_ar.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows console encoding safety
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.agents.chat_agent import chat
from agent.fallbacks.mock_builder import build_mock_plan

BASE_TRIP = {
    "destination": {"city": "Sharm El Sheikh", "country": "Egypt"},
    "start_date": "2026-11-10",
    "end_date": "2026-11-12",
    "total_budget": 60000,
    "currency": "EGP",
    "travelers": 2,
}

BASE_PROFILE_HALAL = {
    "personality": ["calm"],
    "hobbies": ["museums"],
    "food_likes": ["koshari"],
    "food_dislikes": ["very spicy food"],
    "dietary_limits": ["halal"],
    "liked_last_trip": "",
    "disliked_last_trip": "",
}

BASE_PROFILE_NUTFREE = {
    "personality": ["calm"],
    "hobbies": ["museums"],
    "food_likes": [],
    "food_dislikes": [],
    "dietary_limits": ["nut-free"],
    "liked_last_trip": "",
    "disliked_last_trip": "",
}

ARABIC_TESTS = [
    {
        "id": 1,
        "message": "غير الوجهة إلى الإسكندرية",
        "expected": "BLOCK",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Change destination attempt",
    },
    {
        "id": 2,
        "message": "أضف وجبة لحم خنزير",
        "expected": "BLOCK",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Pork dietary violation for halal user",
    },
    {
        "id": 3,
        "message": "اعمل اليوم الثاني أهدأ",
        "expected": "ALLOW",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Make day 2 calmer (pace adjustment)",
    },
    {
        "id": 4,
        "message": "أضف غداء رخيص",
        "expected": "ALLOW",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Add cheap lunch (activity addition)",
    },
    {
        "id": 5,
        "message": "غير الميزانية إلى 80000",
        "expected": "BLOCK",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Change budget without currency clarification",
    },
    {
        "id": 6,
        "message": "غير عدد المسافرين إلى 5",
        "expected": "BLOCK",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Change travelers count attempt",
    },
    {
        "id": 7,
        "message": "استبدل المتحف",
        "expected": "ALLOW",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Replace museum with alternative activity",
    },
    {
        "id": 8,
        "message": "أضف مطعم بيتزا",
        "expected": "ALLOW",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Add pizza restaurant without restrictions",
    },
    {
        "id": 9,
        "message": "أضف طعام يحتوي على مكسرات",
        "expected": "BLOCK",
        "profile": BASE_PROFILE_NUTFREE,
        "intent": "Nut dietary violation for nut-free user",
    },
    {
        "id": 10,
        "message": "حسّن خيارات الفندق",
        "expected": "ALLOW",
        "profile": BASE_PROFILE_HALAL,
        "intent": "Improve hotel options inquiry",
    },
]


def main() -> None:
    print("=" * 70)
    print("Running Task 6 (A9) Arabic Chat Guardrail Test (10 Messages)")
    print("=" * 70)

    # Prepare base plan
    plan_obj = build_mock_plan(BASE_PROFILE_HALAL, BASE_TRIP)
    base_plan = json.loads(plan_obj.model_dump_json(by_alias=True))

    results = []
    all_passed = True

    for test in ARABIC_TESTS:
        t_id = test["id"]
        msg = test["message"]
        expected = test["expected"]
        profile = test["profile"]
        intent = test["intent"]

        resp = chat(
            plan=base_plan,
            trip=BASE_TRIP,
            profile=profile,
            history=[],
            message=msg,
            force_mock=True,
        )

        action = resp.get("action")
        # needs_clarification means guard triggered (BLOCK), updated means ALLOW
        actual = "BLOCK" if action == "needs_clarification" else "ALLOW"
        passed = (actual == expected)

        if not passed:
            all_passed = False

        status_tag = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_tag} Test {t_id:2d}: Expected {expected:<5} | Got {actual:<5} | Intent: {intent}")
        print(f"          Message: '{msg}'")
        print(f"          Response Action: '{action}' | Reason/Msg: {resp.get('message', '')[:80]}")

        results.append({
            "id": t_id,
            "message": msg,
            "intent": intent,
            "expected": expected,
            "actual": actual,
            "action": action,
            "response": resp.get("message", ""),
            "passed": passed,
        })

    # Write documentation report to docs/chat_test_ar.md
    report_file = ROOT_DIR / "docs" / "chat_test_ar.md"
    report_lines = [
        "# Arabic Chat Guardrails Evaluation (Task 6 — A9)",
        "",
        f"> **Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"> **Total Messages:** {len(ARABIC_TESTS)}  ",
        f"> **Status:** {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}",
        "",
        "## Test Results Summary",
        "",
        "| # | Arabic Message | Intent | Expected | Actual | Status | Guard Response Snippet |",
        "|---|----------------|--------|----------|--------|--------|------------------------|",
    ]

    for r in results:
        status_md = "PASS" if r["passed"] else "FAIL"
        clean_resp = r["response"].replace("|", "\\|").replace("\n", " ")[:90]
        report_lines.append(
            f"| {r['id']} | {r['message']} | {r['intent']} | `{r['expected']}` | `{r['actual']}` | **{status_md}** | {clean_resp} |"
        )

    report_lines.extend([
        "",
        "## Analysis & Verification",
        "",
        "- **Immutable Field Guards:** Arabic commands attempting to switch destination (`غير الوجهة إلى الإسكندرية`) or change traveler count (`غير عدد المسافرين إلى 5`) are intercepted before LLM execution, returning friendly contract-aligned clarification explanations.",
        "- **Dietary Guardrails:** Prohibited items in Arabic (e.g. `لحم خنزير` for halal, `مكسرات` for nut-free) are blocked from being added to the itinerary.",
        "- **Budget Controls:** Requests changing budget without explicit currency (`غير الميزانية إلى 80000`) prompt clarification rather than silently overwriting the plan.",
        "- **Legitimate Refinements:** Valid requests (`اعمل اليوم الثاني أهدأ`, `أضف غداء رخيص`, `استبدل المتحف`, `أضف مطعم بيتزا`, `حسّن خيارات الفندق`) are permitted through to the refinement generator.",
        "",
    ])

    report_file.write_text("\n".join(report_lines), encoding="utf-8")
    print("\n" + "=" * 70)
    print(f"Results written to: {report_file}")
    if all_passed:
        print("[ALL 10 ARABIC CHAT GUARD TESTS PASSED]")
        sys.exit(0)
    else:
        print("[FAILED] Some Arabic chat tests did not pass.")
        sys.exit(1)


if __name__ == "__main__":
    main()
