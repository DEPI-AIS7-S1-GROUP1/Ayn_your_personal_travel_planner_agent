"""FastAPI application. Run from backend/:

    uvicorn app.main:app --reload

Interactive API docs: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config, models  # noqa: F401  (models registers the tables on Base)

# Fail fast: without a strong secret anyone could forge login tokens.
# The second check catches the old placeholder from .env.example: it is long enough to pass
# the length test, but it is public, so tokens signed with it could be forged by anyone.
if len(config.AUTH_SECRET_KEY) < 32 or config.AUTH_SECRET_KEY.startswith("generate_with"):
    raise RuntimeError(
        "AUTH_SECRET_KEY is missing or shorter than 32 characters, or it is still the example placeholder.\n"
        'Generate one with:  python -c "import secrets; print(secrets.token_hex(32))"\n'
        "and put it in the .env file at the repository root (see .env.example)."
    )

from app.database import Base, SessionLocal, engine
from app.errors import register_error_handlers
from app.routers import auth, currencies, health, plans, profile, ratings, trips


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create any missing tables on startup (existing tables and data are untouched).
    Base.metadata.create_all(engine)
    if config.SEED_DEMO_DATA:
        # Free hosts can reset SQLite on restart: put the demo accounts back (Y4).
        from scripts.seed_demo import seed_demo

        with SessionLocal() as db:
            created = seed_demo(db)
        print(f"Demo data: created {created or 'nothing (already there)'}")
    yield


app = FastAPI(title="Personal Travel Planner API", version="0.1.0", lifespan=lifespan)

# Lets the Vite frontend (http://localhost:5173) or Next.js call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

# Every endpoint lives under /api (contract section 1).
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(currencies.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(ratings.router, prefix="/api")

