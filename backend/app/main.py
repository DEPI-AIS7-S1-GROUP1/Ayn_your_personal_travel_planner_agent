"""FastAPI application. Run from backend/:

    uvicorn app.main:app --reload

Interactive API docs: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config, models  # noqa: F401  (models registers the tables on Base)
from app.database import Base, engine
from app.errors import register_error_handlers
from app.routers import auth, health

# Fail fast: without a strong secret anyone could forge login tokens.
if len(config.AUTH_SECRET_KEY) < 32:
    raise RuntimeError(
        "AUTH_SECRET_KEY is missing or shorter than 32 characters. Generate one with\n"
        '    python -c "import secrets; print(secrets.token_hex(32))"\n'
        "and put it in the .env file at the repository root (see .env.example)."
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create any missing tables on startup (existing tables and data are untouched).
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Personal Travel Planner API", version="0.1.0", lifespan=lifespan)

# Lets the Next.js frontend (another origin, e.g. localhost:3000) call this API from the browser.
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
