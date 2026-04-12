#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "========================================="
echo "  Elephant Conservation Platform"
echo "  Python $(python --version 2>&1 | awk '{print $2}') | Node $(node --version)"
echo "========================================="
echo ""

# Start backend
echo "[INFO]  Starting backend on port 8000..."
cd /app
uvicorn api_server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "[INFO]  Starting frontend on port 3000..."
cd /app/frontend
npx next dev --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "========================================="
echo ""

# Wait for either process to exit
wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true

# If one dies, kill the other
kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
wait
