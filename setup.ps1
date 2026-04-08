# =============================================================================
# MS Secret Manager — Setup Script (PowerShell)
# Run once to configure your development environment.
# =============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Info  { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "[WARN]  $args" -ForegroundColor Yellow }
function Write-Fail  { Write-Host "[FAIL]  $args" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================"
Write-Host "  MS Secret Manager - Setup"
Write-Host "========================================"
Write-Host ""

$Missing = 0

function Test-Command($Name, $HelpUrl) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Ok "$Name found ($($cmd.Source))"
    } else {
        Write-Fail "$Name not found - $HelpUrl"
        $script:Missing = 1
    }
}

Write-Info "Checking prerequisites..."
Write-Host ""
Test-Command "docker"          "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
Test-Command "docker-compose"  "Included with Docker Desktop"
Test-Command "node"            "Install Node.js 20+: https://nodejs.org/"
Test-Command "npm"             "Included with Node.js"
Test-Command "python"          "Install Python 3.12+: https://www.python.org/downloads/"
Test-Command "pip"             "Included with Python"

Write-Host ""
if ($Missing -eq 1) {
    Write-Warn "Some prerequisites are missing. Docker mode may still work if docker/docker-compose are available."
    Write-Host ""
}

# ---------------------------------------------------------------------------
# 2. Create .env files from examples
# ---------------------------------------------------------------------------
Write-Info "Setting up environment files..."
Write-Host ""

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Ok "Created .env from .env.example"
    Write-Warn "Edit .env with your Azure tenant/client IDs and Cosmos DB connection before starting."
} else {
    Write-Ok ".env already exists - skipping"
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Ok "Created frontend\.env from frontend\.env.example"
    Write-Warn "Edit frontend\.env with your VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID."
} else {
    Write-Ok "frontend\.env already exists - skipping"
}

# ---------------------------------------------------------------------------
# 3. Install backend dependencies
# ---------------------------------------------------------------------------
Write-Host ""
Write-Info "Installing backend dependencies..."
Write-Host ""

$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($PythonCmd) {
    if (-not (Test-Path "backend\.venv")) {
        python -m venv backend\.venv
        Write-Ok "Created Python virtual environment at backend\.venv"
    } else {
        Write-Ok "Virtual environment already exists"
    }

    & "backend\.venv\Scripts\Activate.ps1"
    pip install -r backend\requirements.txt --quiet 2>$null
    Write-Ok "Backend dependencies installed"
    deactivate
} else {
    Write-Warn "Python not found - skipping backend dependency install. Use Docker mode instead."
}

# ---------------------------------------------------------------------------
# 4. Install frontend dependencies
# ---------------------------------------------------------------------------
Write-Host ""
Write-Info "Installing frontend dependencies..."
Write-Host ""

$NpmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($NpmCmd) {
    Push-Location frontend
    npm install --silent 2>$null
    if ($LASTEXITCODE -ne 0) { npm install }
    Pop-Location
    Write-Ok "Frontend dependencies installed"
} else {
    Write-Warn "npm not found - skipping frontend dependency install. Use Docker mode instead."
}

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================"
Write-Host "  Setup Complete"
Write-Host "========================================"
Write-Host ""
Write-Info "Next steps:"
Write-Host ""
Write-Host "  1. Edit .env with your Azure configuration:"
Write-Host "     - AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
Write-Host "     - COSMOS_ENDPOINT, COSMOS_KEY"
Write-Host "     - MSAL_CLIENT_ID, MSAL_AUTHORITY"
Write-Host ""
Write-Host "  2. Edit frontend\.env:"
Write-Host "     - VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID"
Write-Host ""
Write-Host "  3. Start the application:"
Write-Host "     .\startup.ps1              # Docker production mode"
Write-Host "     .\startup.ps1 -Mode dev    # Docker dev mode (hot reload)"
Write-Host "     .\startup.ps1 -Mode local  # Local dev (no Docker)"
Write-Host ""
