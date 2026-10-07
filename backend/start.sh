#!/usr/bin/env bash
# Portable Railway start: works when service Root Directory is /backend
# OR when it is the repo root (cwd contains backend/).
set -euo pipefail
PORT="${PORT:-8000}"
GUNICORN_ARGS=(
  --worker-class eventlet
  -w 1
  --bind "0.0.0.0:${PORT}"
  --timeout 120
  --keep-alive 5
  --log-level info
  app:app
)

if [[ -f app.py && -f requirements.txt ]]; then
  exec gunicorn "${GUNICORN_ARGS[@]}"
elif [[ -f backend/app.py && -f backend/requirements.txt ]]; then
  cd backend
  exec gunicorn "${GUNICORN_ARGS[@]}"
else
  echo "error: cannot locate Flask app.py (cwd=$(pwd))" >&2
  ls -la >&2 || true
  exit 1
fi
