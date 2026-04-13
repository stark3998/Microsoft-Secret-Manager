import logging
import sys
import time
import traceback
import uuid as _uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.cosmos_client import init_cosmos, close_cosmos
from app.routers import (
    health, dashboard, keyvault_items, app_registrations, enterprise_apps,
    settings as settings_router, scans, webhooks, certificates, dns_zones,
    export, acknowledgment, saml_rotation, setup, app_inventory, audit,
)
from app.services.scheduler import start_scheduler, stop_scheduler
from app.utils.telemetry import setup_telemetry

# ---------------------------------------------------------------------------
# Logging — configure the "app" logger directly so uvicorn cannot override it
# ---------------------------------------------------------------------------
_log_formatter = logging.Formatter(
    "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
_log_handler = logging.StreamHandler(sys.stdout)
_log_handler.setFormatter(_log_formatter)

_app_logger = logging.getLogger("app")
_app_logger.setLevel(logging.INFO)
_app_logger.addHandler(_log_handler)
_app_logger.propagate = False  # Don't duplicate into uvicorn's root handler

# Quiet noisy libraries
for _name in (
    "azure.core.pipeline.policies.http_logging_policy",
    "azure.identity", "httpx", "httpcore",
):
    logging.getLogger(_name).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting MS Secret Manager API...")
    await init_cosmos()
    await start_scheduler()
    logger.info("Application started successfully.")
    yield
    logger.info("Shutting down...")
    stop_scheduler()
    await close_cosmos()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="MS Secret Manager",
    description="Azure + Entra ID Secrets/Keys/Certificate Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — configurable via CORS_ORIGINS env var
_cors_origins = [o.strip() for o in (settings.cors_origins or "http://localhost:5000,http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# OpenTelemetry instrumentation
setup_telemetry(app)


# ---------------------------------------------------------------------------
# Centralized error handling
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    correlation_id = str(_uuid.uuid4())
    logger.error(f"Unhandled error [{correlation_id}]: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "correlation_id": correlation_id,
            "status_code": 500,
        },
    )


# ---------------------------------------------------------------------------
# Request / response logging middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    correlation_id = request.headers.get("X-Correlation-ID", str(_uuid.uuid4()))
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({duration_ms:.0f}ms) [{correlation_id}]"
    )
    response.headers["X-Correlation-ID"] = correlation_id
    return response


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(keyvault_items.router)
app.include_router(app_registrations.router)
app.include_router(enterprise_apps.router)
app.include_router(settings_router.router)
app.include_router(scans.router)
app.include_router(webhooks.router)
app.include_router(certificates.router)
app.include_router(dns_zones.router)
app.include_router(export.router)
app.include_router(acknowledgment.router)
app.include_router(saml_rotation.router)
app.include_router(app_inventory.router)
app.include_router(setup.router)
app.include_router(audit.router)
