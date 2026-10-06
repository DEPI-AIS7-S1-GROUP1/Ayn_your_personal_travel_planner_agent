# Personal Travel Planner

A personal travel planner website. The user signs up and answers a short survey about who they are (hobbies, personality, food preferences, what they liked and disliked on their last trip). The system remembers this in a profile. The user then chooses a destination, dates, budget and number of travelers, and an AI agent working in the background builds a day-by-day plan personalised to that profile. It splits the budget across hotel, food, activities and transport, and suggests flight and hotel options. The user reviews the draft, edits it, confirms it, and rates it. Ratings are saved so future plans can improve.

The site is a normal, interactive travel site with forms, picture cards, a timeline and a budget chart. A chat refine panel lets the user describe changes to a draft plan in natural language. The AI is the engine behind the pages.

**Live demo deadline: Oct 19, 2026**

## Where things are

| Path | What it is |
|---|---|
| `docs/api-contract.md` | The API contract. The single source of truth for how the frontend, backend and agent talk to each other. |
| `mock-data/` | Example JSON files that match the contract exactly, for building the frontend before the backend exists. |

Mock files: `profile.json`, `trip-request.json`, `budget-split.json`, `flight-hotel-options.json`, `plan-sharm-el-sheikh.json`, `chat-refinement.json`.

## MVP scope

This is the agreed scope. If something is not in the "Must have" list, it does not block the demo.

### Must have (MVP)

- Sign up / log in
- Onboarding survey
- Profile saved in database
- Trip form
- Budget split with chart
- Daily itinerary from the agent
- Mock flights and hotels
- Draft review and edit
- Chat-based draft plan refinement
- Plan rating
- Deployed website

### Should have (only if the MVP is stable by about Oct 13)

- Food suggestions filtered by preferences
- Live Tavily search for real activities
- Past ratings improve the next plan
- Personality-based UI theme
- Drag-and-drop days

### Out of scope

- Real booking and payments
- Maps and routing
- Mobile app
- Collaborative or multi-user trips

## Timeline

| Sprint | Dates | Goal |
|---|---|---|
| Sprint 1 | Oct 3 - Oct 8 | Foundation and design: API contract, style guide, agent prototype, repo/database/auth skeleton, frontend scaffold |
| Sprint 2 | Oct 9 - Oct 14 | Build and integrate: all screens connected to the real API, survey saved, budget split, draft review, rating |
| Sprint 3 | Oct 15 - Oct 19 | Feature freeze Oct 15. Deploy by Oct 16. Test with 2-3 demo scenarios. Demo-ready by Oct 18. Live demo Oct 19. |

## Team

Manal (team leader), Roaa, Mohammed, Abdelrhman El Yamny, Abdelrhman Esma3el.

## Working rules

- Use Git with feature branches. Do not commit directly to `main`. Every change goes through a pull request reviewed by another person.
- Never commit API keys or passwords. Keep them in a local `.env` file that is ignored by Git.
- Follow the API contract exactly. If it needs to change, tell the team leader first, then add a line to the change log in the contract.
- Say early if you are blocked.
- Use only fake users and fake data in the demo. Free AI tiers may use inputs to improve models.

## Contract and scope sign-off

Each member confirms they have read `docs/api-contract.md`, the mock files and this scope, and have no open questions.

| Member | Read it | No open questions | Date |
|---|---|---|---|
| Roaa (author) | [ ] | [ ] | |
| Manal | [ ] | [ ] | |
| Mohammed | [ ] | [ ] | |
| Abdelrhman El Yamny | [ ] | [ ] | |
| Abdelrhman Esma3el | [ ] | [ ] | |