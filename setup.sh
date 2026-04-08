#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MS Secret Manager — Setup Script
# Run once to configure your development environment.
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
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
echo ""
echo "========================================"
echo "  MS Secret Manager — Setup"
echo "========================================"
echo ""

MISSING=0

check_cmd() {
    if command -v "$1" &>/dev/null; then
        ok "$1 found ($(command -v "$1"))"
    else
        fail "$1 not found — $2"
        MISSING=1
    fi
}

info "Checking prerequisites..."
echo ""
check_cmd "docker"          "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
check_cmd "docker-compose"  "Included with Docker Desktop, or install separately"
check_cmd "node"            "Install Node.js 20+: https://nodejs.org/"
check_cmd "npm"             "Included with Node.js"
check_cmd "python"          "Install Python 3.12+: https://www.python.org/downloads/"
check_cmd "pip"             "Included with Python"

echo ""
if [ "$MISSING" -eq 1 ]; then
    warn "Some prerequisites are missing. Docker mode may still work if docker/docker-compose are available."
    echo ""
fi

# ---------------------------------------------------------------------------
# 2. Create .env files from examples
# ---------------------------------------------------------------------------
info "Setting up environment files..."
echo ""

if [ ! -f ".env" ]; then
    cp .env.example .env
    ok "Created .env from .env.example"
    warn "Edit .env with your Azure tenant/client IDs and Cosmos DB connection before starting."
else
    ok ".env already exists — skipping"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    ok "Created frontend/.env from frontend/.env.example"
    warn "Edit frontend/.env with your VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID."
else
    ok "frontend/.env already exists — skipping"
fi

# ---------------------------------------------------------------------------
# 3. Install backend dependencies (local dev)
# ---------------------------------------------------------------------------
echo ""
info "Installing backend dependencies..."
echo ""

if command -v python &>/dev/null; then
    if [ ! -d "backend/.venv" ]; then
        python -m venv backend/.venv
        ok "Created Python virtual environment at backend/.venv"
    else
        ok "Virtual environment already exists"
    fi

    # Activate and install
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
        source backend/.venv/Scripts/activate
    else
        source backend/.venv/bin/activate
    fi

    pip install -r backend/requirements.txt --quiet
    ok "Backend dependencies installed"
    deactivate
else
    warn "Python not found — skipping backend dependency install. Use Docker mode instead."
fi

# ---------------------------------------------------------------------------
# 4. Install frontend dependencies (local dev)
# ---------------------------------------------------------------------------
echo ""
info "Installing frontend dependencies..."
echo ""

if command -v npm &>/dev/null; then
    cd frontend
    npm install --silent 2>/dev/null || npm install
    cd ..
    ok "Frontend dependencies installed"
else
    warn "npm not found — skipping frontend dependency install. Use Docker mode instead."
fi

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------
echo ""
echo "========================================"
echo "  Setup Complete"
echo "========================================"
echo ""
info "Next steps:"
echo ""
echo "  1. Edit .env with your Azure configuration:"
echo "     - AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
echo "     - COSMOS_ENDPOINT, COSMOS_KEY"
echo "     - MSAL_CLIENT_ID, MSAL_AUTHORITY"
echo ""
echo "  2. Edit frontend/.env:"
echo "     - VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID"
echo ""
echo "  3. Start the application:"
echo "     ./startup.sh              # Docker production mode"
echo "     ./startup.sh --dev        # Docker dev mode (hot reload)"
echo "     ./startup.sh --local      # Local dev (no Docker)"
echo ""
