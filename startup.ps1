# =============================================================================
# MS Secret Manager — Startup Script (PowerShell)
# Usage:
#   .\startup.ps1                Docker production mode
#   .\startup.ps1 -Mode dev     Docker dev mode (hot reload + Cosmos emulator)
#   .\startup.ps1 -Mode local   Local dev mode (no Docker)
#   .\startup.ps1 -Mode stop    Stop all Docker services
# =============================================================================

param(
    [ValidateSet("docker", "dev", "local", "stop")]
    [string]$Mode = "docker"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Info  { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "[WARN]  $args" -ForegroundColor Yellow }
function Write-Fail  { Write-Host "[FAIL]  $args" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------------------
# Pre-flight: check .env exists
# ---------------------------------------------------------------------------
if ($Mode -ne "stop" -and -not (Test-Path ".env")) {
    Write-Fail ".env file not found. Run .\setup.ps1 first."
}

Write-Host ""
Write-Host "========================================"
Write-Host "  MS Secret Manager"
Write-Host "========================================"
Write-Host ""

switch ($Mode) {

    # -----------------------------------------------------------------------
    # Stop services
    # -----------------------------------------------------------------------
    "stop" {
        Write-Info "Stopping all Docker services..."
        docker-compose down 2>$null
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down 2>$null
        Write-Ok "All services stopped."
    }

    # -----------------------------------------------------------------------
    # Docker production mode
    # -----------------------------------------------------------------------
    "docker" {
        Write-Info "Starting in Docker production mode..."
        Write-Host ""
        Write-Info "Building and starting containers..."
        docker-compose up --build -d

        Write-Host ""
        Write-Ok "Services started!"
        Write-Host ""
        Write-Info "Frontend:  http://localhost:5000"
        Write-Info "Backend:   http://localhost:8000"
        Write-Info "Health:    http://localhost:8000/api/health"
        Write-Host ""
        Write-Info "View logs:  docker-compose logs -f"
        Write-Info "Stop:       .\startup.ps1 -Mode stop"
    }

    # -----------------------------------------------------------------------
    # Docker dev mode (hot reload + Cosmos emulator)
    # -----------------------------------------------------------------------
    "dev" {
        Write-Info "Starting in Docker dev mode (hot reload)..."
        Write-Host ""
        Write-Info "Building and starting containers with Cosmos emulator..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build -d

        Write-Host ""
        Write-Ok "Dev services started!"
        Write-Host ""
        Write-Info "Frontend (Vite):     http://localhost:5000"
        Write-Info "Backend (reload):    http://localhost:8000"
        Write-Info "Cosmos Emulator:     https://localhost:8081/_explorer/index.html"
        Write-Info "Health:              http://localhost:8000/api/health"
        Write-Host ""
        Write-Info "View logs:  docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
        Write-Info "Stop:       .\startup.ps1 -Mode stop"
    }

    # -----------------------------------------------------------------------
    # Local dev mode (no Docker)
    # -----------------------------------------------------------------------
    "local" {
        Write-Info "Starting in local dev mode..."
        Write-Host ""

        if (-not (Test-Path "frontend\.env")) {
            Write-Fail "frontend\.env not found. Run .\setup.ps1 first."
        }

        $VenvActivate = "backend\.venv\Scripts\Activate.ps1"
        if (-not (Test-Path $VenvActivate)) {
            Write-Fail "Virtual environment not found at backend\.venv. Run .\setup.ps1 first."
        }

        # Load .env variables into current session
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $key = $Matches[1].Trim()
                $val = $Matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }

        # Start backend as a background job
        Write-Info "Starting backend (FastAPI)..."
        $BackendJob = Start-Job -ScriptBlock {
            param($Dir)
            Set-Location $Dir
            & "backend\.venv\Scripts\Activate.ps1"
            Set-Location backend
            uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        } -ArgumentList $ScriptDir
        Write-Ok "Backend starting (Job ID: $($BackendJob.Id))..."

        # Start frontend as a background job
        Write-Info "Starting frontend (Vite)..."
        $FrontendJob = Start-Job -ScriptBlock {
            param($Dir)
            Set-Location "$Dir\frontend"
            npm run dev
        } -ArgumentList $ScriptDir
        Write-Ok "Frontend starting (Job ID: $($FrontendJob.Id))..."

        Write-Host ""
        Write-Ok "Local dev services starting!"
        Write-Host ""
        Write-Info "Frontend:  http://localhost:5000"
        Write-Info "Backend:   http://localhost:8000"
        Write-Info "Health:    http://localhost:8000/api/health"
        Write-Host ""
        Write-Info "Press Ctrl+C to stop all services."
        Write-Host ""
        Write-Info "To view logs:"
        Write-Host "  Receive-Job -Id $($BackendJob.Id) -Keep    # Backend logs"
        Write-Host "  Receive-Job -Id $($FrontendJob.Id) -Keep   # Frontend logs"
        Write-Host ""

        try {
            # Stream backend output to console
            while ($true) {
                Receive-Job -Id $BackendJob.Id -ErrorAction SilentlyContinue
                Receive-Job -Id $FrontendJob.Id -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500

                # Check if jobs have stopped
                if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
                    Write-Warn "Backend process exited ($($BackendJob.State))"
                    Receive-Job -Id $BackendJob.Id
                    break
                }
                if ($FrontendJob.State -eq "Completed" -or $FrontendJob.State -eq "Failed") {
                    Write-Warn "Frontend process exited ($($FrontendJob.State))"
                    Receive-Job -Id $FrontendJob.Id
                    break
                }
            }
        } finally {
            Write-Host ""
            Write-Info "Shutting down..."
            Stop-Job -Id $BackendJob.Id -ErrorAction SilentlyContinue
            Stop-Job -Id $FrontendJob.Id -ErrorAction SilentlyContinue
            Remove-Job -Id $BackendJob.Id -Force -ErrorAction SilentlyContinue
            Remove-Job -Id $FrontendJob.Id -Force -ErrorAction SilentlyContinue
            Write-Ok "All services stopped."
        }
    }
}
