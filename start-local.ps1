# =============================================================================
# MS Secret Manager — Local Dev Startup (no Docker)
# Launches the FastAPI backend and Vite frontend in separate terminal windows
# so you can view logs independently.
#
# Prerequisites:
#   1. Run .\setup.ps1 once to create venv and install deps
#   2. Fill in .env and frontend\.env with your Azure config
# =============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Info { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok   { Write-Host "[OK]    $args" -ForegroundColor Green }
function Write-Fail { Write-Host "[FAIL]  $args" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "========================================"
Write-Host "  MS Secret Manager — Local Dev"
Write-Host "========================================"
Write-Host ""

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
if (-not (Test-Path ".env")) {
    Write-Fail ".env not found. Copy .env.example to .env and fill in your values, or run .\setup.ps1."
}
if (-not (Test-Path "frontend\.env")) {
    Write-Fail "frontend\.env not found. Copy frontend\.env.example to frontend\.env and fill in your values, or run .\setup.ps1."
}
if (-not (Test-Path "backend\.venv\Scripts\Activate.ps1")) {
    Write-Fail "Python venv not found at backend\.venv. Run .\setup.ps1 first."
}
if (-not (Test-Path "frontend\node_modules")) {
    Write-Fail "frontend\node_modules not found. Run .\setup.ps1 first."
}

# ---------------------------------------------------------------------------
# Kill any processes already using our ports
# ---------------------------------------------------------------------------
Write-Info "Checking ports 8000, 5000..."
foreach ($port in @(8000, 5000)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $procId = $conn.OwningProcess
            if ($procId -and $procId -ne 0) {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Info "Killing $($proc.ProcessName) (PID $procId) on port $port"
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}
Start-Sleep -Seconds 1
Write-Ok "Ports are free"

# ---------------------------------------------------------------------------
# Launch backend in its own terminal window
# ---------------------------------------------------------------------------
Write-Info "Starting backend (uvicorn on http://localhost:8000)..."

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'MS Secret Manager — Backend'
    Set-Location '$ScriptDir\backend'
    & '.venv\Scripts\Activate.ps1'
    Write-Host '========================================' -ForegroundColor Yellow
    Write-Host '  Backend — http://localhost:8000'       -ForegroundColor Yellow
    Write-Host '========================================' -ForegroundColor Yellow
    Write-Host ''
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"@

Write-Ok "Backend terminal launched"

# ---------------------------------------------------------------------------
# Launch frontend in its own terminal window
# ---------------------------------------------------------------------------
Write-Info "Starting frontend (Vite on http://localhost:5000)..."

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'MS Secret Manager — Frontend'
    Set-Location '$ScriptDir\frontend'
    Write-Host '========================================' -ForegroundColor Magenta
    Write-Host '  Frontend — http://localhost:5000'      -ForegroundColor Magenta
    Write-Host '========================================' -ForegroundColor Magenta
    Write-Host ''
    npm run dev
"@

Write-Ok "Frontend terminal launched"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Both services launched in separate"    -ForegroundColor Green
Write-Host "  terminal windows."                     -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Frontend:  http://localhost:5000"
Write-Info "Backend:   http://localhost:8000"
Write-Info "API docs:  http://localhost:8000/docs"
Write-Info "Health:    http://localhost:8000/api/health"
Write-Host ""
Write-Info "Close each terminal window individually to stop its service."
Write-Host ""
