#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup_and_run.sh — Build and run the Elephant Conservation Platform
#
# Usage:
#   chmod +x setup_and_run.sh
#   ./setup_and_run.sh            # build image + run container
#   ./setup_and_run.sh --build    # build image only
#   ./setup_and_run.sh --run      # run container only (skip build)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE_NAME="elephant-conservation"
CONTAINER_NAME="elephant-app"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

# ── Check Docker is installed ────────────────────────────────────
if ! command -v docker &>/dev/null; then
    err "Docker is not installed. Please install Docker Desktop first."
    err "https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# ── Build ────────────────────────────────────────────────────────
build_image() {
    info "Building Docker image (Python 3.11.9 + Node 20)..."
    docker build -t "$IMAGE_NAME" .
    ok "Docker image built: $IMAGE_NAME"
}

# ── Run ──────────────────────────────────────────────────────────
run_container() {
    # Stop and remove existing container if running
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        info "Removing existing container..."
        docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1
    fi

    info "Starting container..."
    docker run --name "$CONTAINER_NAME" \
        -p 8000:8000 \
        -p 3000:3000 \
        -it \
        "$IMAGE_NAME"
}

# ── Main ─────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Elephant Conservation Platform"
echo "========================================="
echo ""

MODE="${1:-all}"

case "$MODE" in
    --build)
        build_image
        echo ""
        ok "Image ready. Run './setup_and_run.sh --run' to start."
        ;;
    --run)
        run_container
        ;;
    *)
        build_image
        echo ""
        run_container
        ;;
esac
