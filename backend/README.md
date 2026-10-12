# Backend — Personal Travel Planner

FastAPI backend: user accounts (sign up, log in), the database, and a health check.
Sprint 2 adds the profile, trip, plan and rating endpoints on top of this.

All request and response formats follow [`docs/api-contract.md`](../docs/api-contract.md).

**Stack:** Python, FastAPI, SQLAlchemy, SQLite (local development), bcrypt (password hashing), JWT (login tokens).

---

## 1. Prerequisites

- **Python 3.11 or newer** (developed and tested with 3.13). Check with `python3 --version`
  (on Windows: `python --version`).
- **Git**.

Nothing else: the local database is SQLite, a single file that is created automatically.

## 2. Get the code

```bash
git clone https://github.com/DEPI-AIS7-S1-GROUP1/Personal-travel-planner-Agent.git
cd Personal-travel-planner-Agent
```

## 3. Install dependencies

All commands from here on run **inside `backend/`**.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Your prompt now starts with `(.venv)`. Run `source .venv/bin/activate` again in every new terminal.
The `.venv/` folder is ignored by Git.

## 4. Configure environment variables

Settings live in a `.env` file at the **repository root** (not inside `backend/`). Git ignores it, so
your values never get committed.

```bash
cp ../.env.example ../.env          # Windows: copy ..\.env.example ..\.env
```

Generate a secret key for signing login tokens:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `../.env` and paste the output after `AUTH_SECRET_KEY=`:

```
AUTH_SECRET_KEY=3f9a1c2b...   (your own 64-character value)
```

| Variable | What it is | Default |
|---|---|---|
| `AUTH_SECRET_KEY` | Signs login tokens. **Required**, at least 32 characters. Never share it or commit it. | none — the server will not start without it |
| `DATABASE_URL` | Where the database is | `sqlite:///./travel_planner.db` (the file `backend/travel_planner.db`) |
| `AUTH_TOKEN_EXPIRE_MINUTES` | How long a login stays valid | `60` |
| `CORS_ORIGINS` | Frontend address(es) allowed to call the API, comma-separated | `http://localhost:3000` |

The agent keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`) are not used by the backend yet.

## 5. Database

Nothing to do: **the tables are created automatically when the server starts**, in
`backend/travel_planner.db` (ignored by Git).

To create the tables without starting the server:

```bash
python -m scripts.init_db
```

To start over with an empty database (for example after someone changes `app/models.py`), stop the
server, delete the file and start again:

```bash
rm travel_planner.db                # Windows: del travel_planner.db
```

The tables and how they relate are described in [`app/models.py`](app/models.py):
`users` 1–0..1 `profiles`, `users` 1–many `trips`, `trips` 1–1 `plans`, `plans` 1–0..1 `ratings`,
`plans` 1–many `conversations` 1–many `chat_messages` (the chat refine panel's history).

## 6. Run the server

```bash
uvicorn app.main:app --reload
```

The API is now at **http://localhost:8000**. `--reload` restarts it when you save a file.
Stop it with `Ctrl+C`.

**Interactive docs: http://localhost:8000/docs** — every endpoint, with a "Try it out" button.
This is the easiest way to test, on any operating system.

## 7. Check that it works

### Health check

```bash
curl http://localhost:8000/api/health
```

```json
{"status":"ok","database":"ok"}
```

### Sign up

```bash
curl -X POST http://localhost:8000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "sara@example.com", "password": "secret123"}'
```

`201 Created`:

```json
{
  "user": {"id": "user_3f9a1c2b7d4e8f60", "email": "sara@example.com", "created_at": "2026-10-04"},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Signing up again with the same email returns `409` with code `EMAIL_TAKEN`.

### Log in

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sara@example.com", "password": "secret123"}'
```

`200 OK` with the same shape as sign up. A wrong password, or an email that does not exist, returns:

```json
{"error": {"code": "INVALID_CREDENTIALS", "message": "Wrong email or password."}}
```

> Windows PowerShell handles quotes in `curl` differently. Use http://localhost:8000/docs instead.

### Confirm the password is not stored

```bash
sqlite3 travel_planner.db "SELECT email, password_hash FROM users;"
```

You see a bcrypt hash starting with `$2b$12$`, never `secret123`.
(If `sqlite3` is not installed, skip this: the automated tests check it.)

Use only fake users and fake data (see the team rules).

## 8. Run the tests

```bash
pytest
```

The tests use their own in-memory database and a test-only key; they do not touch your
`travel_planner.db` or `.env`. They cover the schema rules, password hashing, tokens, sign up,
log in and the health check.

---

## Endpoints available now

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | none | Server and database are up |
| `POST` | `/api/signup` | none | Create an account, returns `{user, token}` |
| `POST` | `/api/login` | none | Log in, returns `{user, token}` |

Every error uses the contract format: `{"error": {"code": "...", "message": "..."}}`.

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid email, password under 8 characters or over 72 bytes, missing field |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token on a protected endpoint |
| 409 | `EMAIL_TAKEN` | Email already registered (not case-sensitive) |
| 503 | `SERVICE_UNAVAILABLE` | Health check cannot reach the database |

## Using the token (frontend, Task 5)

Save the `token` from sign up or log in and send it with every protected request:

```
Authorization: Bearer <token>
```

It expires after `AUTH_TOKEN_EXPIRE_MINUTES` (60). When any request returns `401 UNAUTHORIZED`,
send the user back to the login page. Logging out means deleting the saved token.

## Adding a protected endpoint (Sprint 2)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import ApiError
from app.models import User

router = APIRouter()

@router.get("/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # `user` is the logged-in user; requests without a valid token never reach this line.
    ...
    raise ApiError(409, "PROFILE_REQUIRED", "Complete the survey first.")  # contract errors
```

Then register the router in `app/main.py` with `prefix="/api"`.

- Only return data that belongs to `user`. Someone else's data must return `404 NOT_FOUND` (contract rule).
- JSON columns (`itinerary`, `options`, profile lists): assign a new value
  (`plan.itinerary = new_list`) instead of changing the list in place, or the change is not saved.

## Project structure

```
backend/
├── app/
│   ├── main.py          # the FastAPI app: CORS, error handlers, routes under /api
│   ├── config.py        # reads settings from ../.env
│   ├── database.py      # database connection and sessions
│   ├── models.py        # the tables: users, profiles, trips, plans, ratings, conversations, chat_messages
│   ├── schemas.py       # request/response shapes and validation
│   ├── security.py      # password hashing (bcrypt) and tokens (JWT)
│   ├── errors.py        # contract error format
│   ├── deps.py          # get_db, get_current_user
│   └── routers/
│       ├── health.py    # GET /api/health
│       └── auth.py      # POST /api/signup, POST /api/login
├── scripts/
│   └── init_db.py       # create the tables without starting the server
├── tests/               # pytest
├── requirements.txt
└── pytest.ini
```

## Common problems

| Problem | Fix |
|---|---|
| `RuntimeError: AUTH_SECRET_KEY is missing or shorter than 32 characters` | Step 4: the `.env` file must be at the repository root and contain a generated key. |
| `command not found: uvicorn` / `pytest`, or `No module named 'fastapi'` | The virtual environment is not active: `source .venv/bin/activate`. |
| `ModuleNotFoundError: No module named 'app'` | Run commands from inside `backend/`, not the repository root. |
| `Address already in use` | Another server is on port 8000. Stop it, or use `uvicorn app.main:app --reload --port 8001`. |
| `no such column` / `no such table` after pulling new code | The tables changed. Delete `travel_planner.db` and restart (section 5). |
| The browser console shows a CORS error | Add the frontend's address to `CORS_ORIGINS` in `.env` and restart the server. |
| Requests suddenly return `401 UNAUTHORIZED` | The token expired (60 minutes). Log in again. |
| `python3: command not found` on Windows | Use `python` instead of `python3`. |
