"""Settings read from environment variables.

Values come from the real environment first, then from the .env file at the
repository root (see .env.example). Nothing secret is hard-coded here.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]

# override=False: a variable already set in the shell wins over .env.
load_dotenv(REPO_ROOT / ".env", override=False)

# Relative SQLite paths resolve against the current directory; run from backend/.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./travel_planner.db")

# Signs login tokens. No default on purpose: app/main.py refuses to start without it.
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "")
AUTH_TOKEN_EXPIRE_MINUTES = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "60"))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
