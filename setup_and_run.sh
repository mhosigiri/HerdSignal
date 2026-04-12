#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup_and_run.sh — Install dependencies and launch both servers
#
# Usage:
#   chmod +x setup_and_run.sh
#   ./setup_and_run.sh            # install + run
#   ./setup_and_run.sh --install  # install only
#   ./setup_and_run.sh --run      # run only (skip install)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/elephant-separator"
FRONTEND_DIR="$BACKEND_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# ── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

# ── Cleanup on exit ─────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    info "Shutting down servers..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && ok "Backend stopped"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "Frontend stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Prerequisite checks ─────────────────────────────────────────
check_prerequisites() {
    local missing=0

    if ! command -v python &>/dev/null; then
        err "python is not installed. Please install Python 3.9+ first."
        missing=1
    fi

    if ! command -v node &>/dev/null; then
        err "node is not installed. Please install Node.js 18+ first."
        missing=1
    fi

    if ! command -v npm &>/dev/null; then
        err "npm is not installed. Please install npm first."
        missing=1
    fi

    if [ "$missing" -eq 1 ]; then
        exit 1
    fi

    ok "python $(python --version 2>&1 | awk '{print $2}')"
    ok "node $(node --version)"
    ok "npm $(npm --version)"
}

# ── Backend install ──────────────────────────────────────────────
install_backend() {
    info "Setting up Python backend..."

    if [ ! -d "$BACKEND_DIR" ]; then
        err "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    cd "$BACKEND_DIR"

    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        info "Creating Python virtual environment..."
        python -m venv .venv
        ok "Virtual environment created"
    else
        ok "Virtual environment already exists"
    fi

    # Activate and install
    source .venv/bin/activate
    info "Installing Python dependencies (this may take a few minutes)..."
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    pip install fastapi uvicorn python-multipart --quiet
    ok "Backend dependencies installed"
    deactivate
}

# ── Frontend install ─────────────────────────────────────────────
install_frontend() {
    info "Setting up Next.js frontend..."

    if [ ! -d "$FRONTEND_DIR" ]; then
        err "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi

    cd "$FRONTEND_DIR"

    # Copy .env.example to .env if .env doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        warn "Created .env from .env.example — edit it with your API keys"
    fi

    info "Installing Node.js dependencies..."
    npm install --silent 2>&1 | tail -1
    ok "Frontend dependencies installed"
}

# ── Run backend ──────────────────────────────────────────────────
run_backend() {
    info "Starting backend on port $BACKEND_PORT..."
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    uvicorn api_server:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
    BACKEND_PID=$!
    ok "Backend running at http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
}

# ── Run frontend ─────────────────────────────────────────────────
run_frontend() {
    info "Starting frontend on port $FRONTEND_PORT..."
    cd "$FRONTEND_DIR"
    npx next dev --port "$FRONTEND_PORT" &
    FRONTEND_PID=$!
    ok "Frontend running at http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
}

# ── Main ─────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Elephant Conservation Platform Setup"
echo "========================================="
echo ""

MODE="${1:-all}"

check_prerequisites

case "$MODE" in
    --install)
        install_backend
        install_frontend
        echo ""
        ok "All dependencies installed. Run './setup_and_run.sh --run' to start servers."
        ;;
    --run)
        run_backend
        run_frontend
        echo ""
        echo "========================================="
        printf "  ${GREEN}Both servers are running!${NC}\n"
        echo "  Backend:  http://localhost:$BACKEND_PORT"
        echo "  Frontend: http://localhost:$FRONTEND_PORT"
        echo "========================================="
        echo "  Press Ctrl+C to stop both servers"
        echo "========================================="
        echo ""
        wait
        ;;
    *)
        install_backend
        install_frontend
        echo ""
        run_backend
        run_frontend
        echo ""
        echo "========================================="
        printf "  ${GREEN}Both servers are running!${NC}\n"
        echo "  Backend:  http://localhost:$BACKEND_PORT"
        echo "  Frontend: http://localhost:$FRONTEND_PORT"
        echo "========================================="
        echo "  Press Ctrl+C to stop both servers"
        echo "========================================="
        echo ""
        wait
        ;;
esac
