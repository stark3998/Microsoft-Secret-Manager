# =============================================================================
# MS Secret Manager — Local Dev Startup (no Docker)
# Starts the FastAPI backend and Vite frontend side by side.
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
# Load .env into the current process so the backend picks it up
# ---------------------------------------------------------------------------
Write-Info "Loading .env..."
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $idx  = $line.IndexOf("=")
        $key  = $line.Substring(0, $idx).Trim()
        $val  = $line.Substring($idx + 1).Trim()
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}
Write-Ok ".env loaded"

# ---------------------------------------------------------------------------
# Start backend
# ---------------------------------------------------------------------------
Write-Info "Starting backend (uvicorn on http://localhost:8000)..."

$BackendJob = Start-Job -ScriptBlock {
    param($Root)
    Set-Location $Root

    # Activate venv
    & "backend\.venv\Scripts\Activate.ps1"

    # Re-load .env inside the job (job inherits env but just in case)
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $idx  = $line.IndexOf("=")
            $key  = $line.Substring(0, $idx).Trim()
            $val  = $line.Substring($idx + 1).Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }

    Set-Location backend
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
} -ArgumentList $ScriptDir

Write-Ok "Backend job started (ID: $($BackendJob.Id))"

# ---------------------------------------------------------------------------
# Start frontend
# ---------------------------------------------------------------------------
Write-Info "Starting frontend (Vite on http://localhost:3000)..."

$FrontendJob = Start-Job -ScriptBlock {
    param($Root)
    Set-Location "$Root\frontend"
    npm run dev
} -ArgumentList $ScriptDir

Write-Ok "Frontend job started (ID: $($FrontendJob.Id))"

# ---------------------------------------------------------------------------
# Running
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Both services are starting up"        -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Frontend:  http://localhost:3000"
Write-Info "Backend:   http://localhost:8000"
Write-Info "API docs:  http://localhost:8000/docs"
Write-Info "Health:    http://localhost:8000/api/health"
Write-Host ""
Write-Info "Press Ctrl+C to stop both services."
Write-Host ""

# ---------------------------------------------------------------------------
# Stream logs until Ctrl+C
# ---------------------------------------------------------------------------
try {
    while ($true) {
        # Print any new output from both jobs
        $backendOutput  = Receive-Job -Id $BackendJob.Id  -ErrorAction SilentlyContinue
        $frontendOutput = Receive-Job -Id $FrontendJob.Id -ErrorAction SilentlyContinue

        if ($backendOutput)  { $backendOutput  | ForEach-Object { Write-Host "[backend]  $_" -ForegroundColor Yellow } }
        if ($frontendOutput) { $frontendOutput | ForEach-Object { Write-Host "[frontend] $_" -ForegroundColor Magenta } }

        # Exit if either job died
        if ($BackendJob.State  -notin @("Running", "NotStarted")) {
            Write-Host ""
            Write-Host "[WARN]  Backend exited ($($BackendJob.State))" -ForegroundColor Yellow
            Receive-Job -Id $BackendJob.Id -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
            break
        }
        if ($FrontendJob.State -notin @("Running", "NotStarted")) {
            Write-Host ""
            Write-Host "[WARN]  Frontend exited ($($FrontendJob.State))" -ForegroundColor Yellow
            Receive-Job -Id $FrontendJob.Id -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
            break
        }

        Start-Sleep -Milliseconds 300
    }
} finally {
    Write-Host ""
    Write-Info "Shutting down..."
    Stop-Job  -Id $BackendJob.Id  -ErrorAction SilentlyContinue
    Stop-Job  -Id $FrontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $BackendJob.Id  -Force -ErrorAction SilentlyContinue
    Remove-Job -Id $FrontendJob.Id -Force -ErrorAction SilentlyContinue
    Write-Ok "All services stopped."
}
