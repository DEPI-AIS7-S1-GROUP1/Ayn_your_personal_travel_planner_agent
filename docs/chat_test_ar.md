# Arabic Chat Guardrails Evaluation (Task 6 — A9)

> **Generated:** 2026-10-15 13:08:14 UTC  
> **Total Messages:** 10  
> **Status:** ALL TESTS PASSED

## Test Results Summary

| # | Arabic Message | Intent | Expected | Actual | Status | Guard Response Snippet |
|---|----------------|--------|----------|--------|--------|------------------------|
| 1 | غير الوجهة إلى الإسكندرية | Change destination attempt | `BLOCK` | `BLOCK` | **PASS** | Destination cannot be changed for an existing plan because the contract specifies destinat |
| 2 | أضف وجبة لحم خنزير | Pork dietary violation for halal user | `BLOCK` | `BLOCK` | **PASS** | Your profile specifies a halal diet, which excludes 'لحم خنزير'. Would you like to keep yo |
| 3 | اعمل اليوم الثاني أهدأ | Make day 2 calmer (pace adjustment) | `ALLOW` | `ALLOW` | **PASS** | Done. I updated your plan to include 'Personalized Highlight in Sharm El Sheikh'. |
| 4 | أضف غداء رخيص | Add cheap lunch (activity addition) | `ALLOW` | `ALLOW` | **PASS** | Done. I updated your plan to include 'Personalized Highlight in Sharm El Sheikh'. |
| 5 | غير الميزانية إلى 80000 | Change budget without currency clarification | `BLOCK` | `BLOCK` | **PASS** | What total budget would you like me to use? Please include the amount and currency. |
| 6 | غير عدد المسافرين إلى 5 | Change travelers count attempt | `BLOCK` | `BLOCK` | **PASS** | The number of travelers cannot be changed for an existing plan because flight and hotel bo |
| 7 | استبدل المتحف | Replace museum with alternative activity | `ALLOW` | `ALLOW` | **PASS** | Done. I updated your plan to include 'Personalized Highlight in Sharm El Sheikh'. |
| 8 | أضف مطعم بيتزا | Add pizza restaurant without restrictions | `ALLOW` | `ALLOW` | **PASS** | Done. I updated your plan to include 'Personalized Highlight in Sharm El Sheikh'. |
| 9 | أضف طعام يحتوي على مكسرات | Nut dietary violation for nut-free user | `BLOCK` | `BLOCK` | **PASS** | Your profile specifies a nut-free diet, which excludes 'مكسرات'. Would you like to keep yo |
| 10 | حسّن خيارات الفندق | Improve hotel options inquiry | `ALLOW` | `ALLOW` | **PASS** | Done. I updated your plan to include 'Personalized Highlight in Sharm El Sheikh'. |

## Analysis & Verification

- **Immutable Field Guards:** Arabic commands attempting to switch destination (`غير الوجهة إلى الإسكندرية`) or change traveler count (`غير عدد المسافرين إلى 5`) are intercepted before LLM execution, returning friendly contract-aligned clarification explanations.
- **Dietary Guardrails:** Prohibited items in Arabic (e.g. `لحم خنزير` for halal, `مكسرات` for nut-free) are blocked from being added to the itinerary.
- **Budget Controls:** Requests changing budget without explicit currency (`غير الميزانية إلى 80000`) prompt clarification rather than silently overwriting the plan.
- **Legitimate Refinements:** Valid requests (`اعمل اليوم الثاني أهدأ`, `أضف غداء رخيص`, `استبدل المتحف`, `أضف مطعم بيتزا`, `حسّن خيارات الفندق`) are permitted through to the refinement generator.
