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
