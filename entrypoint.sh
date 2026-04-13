#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

echo "========================================="
echo "  Elephant Separator API"
echo "  Python $(python --version 2>&1 | awk '{print $2}')"
echo "  Listening on :${PORT}"
echo "========================================="

cd /app/elephant-separator
exec uvicorn api_server:app --host 0.0.0.0 --port "${PORT}"
