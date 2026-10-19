#!/usr/bin/env bash
# Plan B for the demo (Y7): run the backend on this laptop with the demo data, and expose it on a
# public HTTPS address through a Cloudflare quick tunnel (no account needed).
#
# Usage, from the repository root:
#     ./backend/scripts/run_demo_from_laptop.sh
#
# Needs: the .venv from the README, a filled .env (AUTH_SECRET_KEY, DEMO_USER_PASSWORD, and the
# Vercel address in CORS_ORIGINS), and cloudflared (macOS: brew install cloudflared).
# Stop everything with Ctrl+C.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8000}"

if [ ! -x "$REPO_ROOT/.venv/bin/uvicorn" ]; then
  echo "Missing .venv: follow 'Install dependencies' in backend/README.md first." >&2; exit 1
fi
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Missing cloudflared: install it with 'brew install cloudflared'." >&2; exit 1
fi

cd "$REPO_ROOT/backend"
# Recreate the demo accounts on start (they are skipped if they already exist).
export SEED_DEMO_DATA=true

"$REPO_ROOT/.venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port "$PORT" &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT

# Wait until the backend answers before opening the tunnel.
for _ in $(seq 1 60); do
  if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null; then break; fi
  sleep 1
done
curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null || { echo "The backend did not start." >&2; exit 1; }
echo "Backend is up on http://127.0.0.1:$PORT"

echo
echo "Opening the tunnel. Copy the https://....trycloudflare.com address it prints, then on Vercel set"
echo "  VITE_API_BASE_URL = https://<that address>/api"
echo "and redeploy the frontend. Test it: https://<that address>/api/health"
echo
cloudflared tunnel --url "http://127.0.0.1:$PORT"
