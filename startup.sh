#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MS Secret Manager — Startup Script
# Usage:
#   ./startup.sh              Docker production mode
#   ./startup.sh --dev        Docker dev mode (hot reload + Cosmos emulator)
#   ./startup.sh --local      Local dev mode (no Docker)
#   ./startup.sh --stop       Stop all Docker services
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

MODE="${1:---docker}"

# ---------------------------------------------------------------------------
# Pre-flight: check .env exists
# ---------------------------------------------------------------------------
if [ ! -f ".env" ] && [ "$MODE" != "--stop" ]; then
    fail ".env file not found. Run ./setup.sh first."
fi

# ---------------------------------------------------------------------------
# --stop: Shut down Docker services
# ---------------------------------------------------------------------------
if [ "$MODE" == "--stop" ]; then
    info "Stopping all Docker services..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true
    ok "All services stopped."
    exit 0
fi

echo ""
echo "========================================"
echo "  MS Secret Manager"
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Docker production mode (default)
# ---------------------------------------------------------------------------
if [ "$MODE" == "--docker" ] || [ "$MODE" == "" ]; then
    info "Starting in Docker production mode..."
    echo ""
    info "Building and starting containers..."
    docker-compose up --build -d

    echo ""
    ok "Services started!"
    echo ""
    info "Frontend:  http://localhost:5000"
    info "Backend:   http://localhost:8000"
    info "Health:    http://localhost:8000/api/health"
    echo ""
    info "View logs:  docker-compose logs -f"
    info "Stop:       ./startup.sh --stop"

# ---------------------------------------------------------------------------
# Docker dev mode (hot reload + Cosmos emulator)
# ---------------------------------------------------------------------------
elif [ "$MODE" == "--dev" ]; then
    info "Starting in Docker dev mode (hot reload)..."
    echo ""
    info "Building and starting containers with Cosmos emulator..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build -d

    echo ""
    ok "Dev services started!"
    echo ""
    info "Frontend (Vite):     http://localhost:5000"
    info "Backend (reload):    http://localhost:8000"
    info "Cosmos Emulator:     https://localhost:8081/_explorer/index.html"
    info "Health:              http://localhost:8000/api/health"
    echo ""
    info "View logs:  docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
    info "Stop:       ./startup.sh --stop"

# ---------------------------------------------------------------------------
# Local dev mode (no Docker)
# ---------------------------------------------------------------------------
elif [ "$MODE" == "--local" ]; then
    info "Starting in local dev mode..."
    echo ""

    # Check frontend .env
    if [ ! -f "frontend/.env" ]; then
        fail "frontend/.env not found. Run ./setup.sh first."
    fi

    # Start backend
    info "Starting backend (FastAPI)..."

    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
        ACTIVATE="backend/.venv/Scripts/activate"
    else
        ACTIVATE="backend/.venv/bin/activate"
    fi

    if [ ! -f "$ACTIVATE" ]; then
        fail "Virtual environment not found at backend/.venv. Run ./setup.sh first."
    fi

    # Export .env vars for the backend
    set -a
    source .env
    set +a

    # Start backend in background
    (
        source "$ACTIVATE"
        cd backend
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ) &
    BACKEND_PID=$!
    ok "Backend starting (PID: $BACKEND_PID)..."

    # Start frontend in background
    info "Starting frontend (Vite)..."
    (
        cd frontend
        npm run dev
    ) &
    FRONTEND_PID=$!
    ok "Frontend starting (PID: $FRONTEND_PID)..."

    echo ""
    ok "Local dev services starting!"
    echo ""
    info "Frontend:  http://localhost:5000"
    info "Backend:   http://localhost:8000"
    info "Health:    http://localhost:8000/api/health"
    echo ""
    info "Press Ctrl+C to stop all services."

    # Trap Ctrl+C to kill both processes
    cleanup() {
        echo ""
        info "Shutting down..."
        kill "$BACKEND_PID" 2>/dev/null || true
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
        ok "All services stopped."
    }
    trap cleanup SIGINT SIGTERM

    # Wait for both processes
    wait

# ---------------------------------------------------------------------------
# Unknown flag
# ---------------------------------------------------------------------------
else
    echo "Usage: ./startup.sh [--dev | --local | --stop]"
    echo ""
    echo "Modes:"
    echo "  (default)   Docker production mode"
    echo "  --dev       Docker dev mode (hot reload + Cosmos emulator)"
    echo "  --local     Local dev mode (no Docker)"
    echo "  --stop      Stop all Docker services"
    exit 1
fi
