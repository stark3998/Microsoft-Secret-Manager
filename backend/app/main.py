import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.cosmos_client import init_cosmos, close_cosmos
from app.routers import (
    health, dashboard, keyvault_items, app_registrations, enterprise_apps,
    settings as settings_router, scans, webhooks, certificates, dns_zones,
    export, acknowledgment,
)
from app.services.scheduler import start_scheduler, stop_scheduler
from app.utils.telemetry import setup_telemetry

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
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
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
