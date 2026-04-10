import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.cosmos_client import init_cosmos, close_cosmos
from app.routers import (
    health, dashboard, keyvault_items, app_registrations, enterprise_apps,
    settings as settings_router, scans, webhooks, certificates, dns_zones,
    export, acknowledgment, saml_rotation, setup, app_inventory,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry instrumentation
setup_telemetry(app)

# Register routers
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
