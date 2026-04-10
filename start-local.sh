#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MS Secret Manager — Local Dev Startup (no Docker)
# Starts the FastAPI backend and Vite frontend side by side.
#
# Prerequisites:
#   1. Run ./setup.sh once to create venv and install deps
#   2. Fill in .env and frontend/.env with your Azure config
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

echo ""
echo "========================================"
echo "  MS Secret Manager — Local Dev"
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
[ ! -f ".env" ]                          && fail ".env not found. Copy .env.example to .env and fill in your values, or run ./setup.sh."
[ ! -f "frontend/.env" ]                 && fail "frontend/.env not found. Copy frontend/.env.example to frontend/.env, or run ./setup.sh."
[ ! -d "frontend/node_modules" ]         && fail "frontend/node_modules not found. Run ./setup.sh first."

# Detect venv activate path
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* || "${OSTYPE:-}" == win32* ]]; then
    ACTIVATE="backend/.venv/Scripts/activate"
else
    ACTIVATE="backend/.venv/bin/activate"
fi
[ ! -f "$ACTIVATE" ] && fail "Python venv not found at backend/.venv. Run ./setup.sh first."

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
info "Loading .env..."
set -a
source .env
set +a
ok ".env loaded"

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    info "Shutting down..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && wait "$BACKEND_PID"  2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && wait "$FRONTEND_PID" 2>/dev/null
    ok "All services stopped."
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Start backend
# ---------------------------------------------------------------------------
info "Starting backend (uvicorn on http://localhost:8000)..."
(
    source "$ACTIVATE"
    cd backend
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload 2>&1 | \
        while IFS= read -r line; do echo -e "${YELLOW}[backend]${NC}  $line"; done
) &
BACKEND_PID=$!
ok "Backend started (PID: $BACKEND_PID)"

# ---------------------------------------------------------------------------
# Start frontend
# ---------------------------------------------------------------------------
info "Starting frontend (Vite on http://localhost:5000)..."
(
    cd frontend
    npm run dev 2>&1 | \
        while IFS= read -r line; do echo -e "${MAGENTA}[frontend]${NC} $line"; done
) &
FRONTEND_PID=$!
ok "Frontend started (PID: $FRONTEND_PID)"

# ---------------------------------------------------------------------------
# Running
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Both services are starting up${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
info "Frontend:  http://localhost:5000"
info "Backend:   http://localhost:8000"
info "API docs:  http://localhost:8000/docs"
info "Health:    http://localhost:8000/api/health"
echo ""
info "Press Ctrl+C to stop both services."
echo ""

# Wait for either process to exit
wait -n 2>/dev/null || wait
