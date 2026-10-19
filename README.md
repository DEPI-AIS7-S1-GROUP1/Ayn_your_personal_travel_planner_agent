# Ayn — Personal Travel Planner

Ayn (أين, "where?") is a personal travel planner for trips inside Egypt. The user describes
themselves once in a short survey, and an AI agent builds a personalised day-by-day plan with a
budget split, which the user can edit by hand or through a chat panel, confirm and rate.

| Folder | What it is |
|---|---|
| `backend/` | FastAPI API, SQLite database, accounts — see [`backend/README.md`](backend/README.md) |
| `agent/` | The 3-tier plan generator (CrewAI / Gemini, then Groq, then an offline mock) and the chat agent |
| `frontend/` | React + Vite website — see [`frontend/README.md`](frontend/README.md) |
| `docs/api-contract.md` | The data formats every part follows |
| `DESIGN.md` | Visual rules |

---

## Run it locally

One install covers the backend and the agent. Full details and checks are in
[`backend/README.md`](backend/README.md).

```bash
git clone https://github.com/DEPI-AIS7-S1-GROUP1/Personal-travel-planner-Agent.git
cd Personal-travel-planner-Agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then set AUTH_SECRET_KEY (backend/README.md, section 4)
cd backend && uvicorn app.main:app --reload
```

Open http://localhost:8000/docs. **No AI key is needed to try it:** the agent falls back to its
offline tier and still returns a complete plan. Add your own keys to `.env` for real plans.

Frontend, in a second terminal: `cd frontend && npm install && npm run dev`.

---

## Deploy the backend

These settings work on any Python host (Render, Railway, Koyeb, ...):

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Python version | 3.13 (3.11 or newer) |

Environment variables on the host (never in the repository):

| Variable | Value on the live host |
|---|---|
| `AUTH_SECRET_KEY` | A new value from `python -c "import secrets; print(secrets.token_hex(32))"` |
| `AUTH_TOKEN_EXPIRE_MINUTES` | `1440`, so a login lasts the whole demo day |
| `DATABASE_URL` | `sqlite:///./travel_planner.db`, or a hosted PostgreSQL URL |
| `CORS_ORIGINS` | The Vercel address, e.g. `https://your-app.vercel.app` (comma-separate several) |
| `SEED_DEMO_DATA` | `true` — free hosts can wipe SQLite on restart; this puts the demo accounts back |
| `DEMO_USER_PASSWORD` | The password Manal's demo script uses |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini key and model |
| `GROQ_API_KEY` (or `GROQ_API_KEY_CONTEXT` / `_SEARCH` / `_PLANNER`), `GROQ_MODEL` | Groq keys and model |
| `TAVILY_API_KEY` | Tavily key |

Check it: `https://<your-backend>/api/health` must answer `"status": "ok"` and show `yes` for every
AI provider you configured. Then sign up and log in once with a test account.

On Vercel, set `VITE_API_BASE_URL` to `https://<your-backend>/api` and redeploy the frontend.

---

## Run the demo from a laptop (plan B)

If the host is down on demo day, run the backend on a laptop and expose it with a free
Cloudflare tunnel:

```bash
./backend/scripts/run_demo_from_laptop.sh
```

It starts the backend with the demo data, waits until `/api/health` answers, and opens the tunnel.
Needs the `.venv` above, a filled `.env` (with the Vercel address in `CORS_ORIGINS`), and
`cloudflared` (`brew install cloudflared`).

Copy the `https://....trycloudflare.com` address it prints, set `VITE_API_BASE_URL` on Vercel to
`https://<that address>/api`, and redeploy the frontend (about a minute). The address changes every
time the tunnel starts, so do this once, before the demo begins, and keep the laptop awake.

---
## Scope

**Must have**
- Sign up and log in, onboarding survey, profile saved in the database
- Trip form, budget split with chart, daily itinerary from the agent
- Mock flights and hotels, draft review and edit, plan rating
- Deployed website
- Arabic Level 1: EN | عربي toggle, all fixed interface text in Arabic, right-to-left layout, choice remembered after refresh

**Should have**
- Food suggestions filtered by preferences
- Live Tavily search for real activities
- Past ratings improve the next plan
- Personality-based theme, chat refine panel, drag-and-drop days
- Arabic Level 2 (stretch): trips created with `language: "ar"`, Arabic plan text, dietary and dislike checks on Arabic words. Cut if not passing its checks by 18 Oct at noon.

**Out of scope**
- Real booking and payments, maps and routing, mobile app, collaborative trips
- Languages other than English and Arabic, an Arabic place-name database, voice
---

## Team rules

- Work on a feature branch and open a pull request; a second person reviews it. Nobody commits to `main`.
- API keys and passwords live only in your local `.env` or the host's settings. Never in the repository, documents or chat.
- Follow [`docs/api-contract.md`](docs/api-contract.md). If it must change, tell Manal first.
