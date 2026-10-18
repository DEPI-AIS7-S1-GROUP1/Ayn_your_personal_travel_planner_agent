"""Test global timeout mechanism for agent execution.

Usage:
    python scripts/test_timeout.py
"""

import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from agent.main import _run_tier_with_timeout


def slow_mock_fn(profile: dict, trip: dict):
    """Simulate a hanging or slow tier execution."""
    time.sleep(10)
    return "completed"


def main():
    print("[RUN] Testing timeout with slow_mock_fn (timeout=2s)...")
    try:
        _run_tier_with_timeout(slow_mock_fn, {}, {}, timeout_s=2)
        print("[FAIL] Function should have timed out but completed!")
        sys.exit(1)
    except TimeoutError as exc:
        print(f"[OK] Timeout triggered correctly: {exc}")
        sys.exit(0)


if __name__ == "__main__":
    main()
