import asyncio
import logging

from fastapi import APIRouter, Depends, BackgroundTasks

from app.auth.dependencies import require_admin, require_viewer
from app.db.cosmos_client import get_scan_history_container
from app.db.queries import query_items
from app.models.user import UserInfo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    user: UserInfo = Depends(require_admin),
):
    """Trigger an immediate full scan."""
    from app.services.scanner.orchestrator import run_full_scan

    background_tasks.add_task(run_full_scan, triggered_by=user.email)
    return {"status": "started", "message": "Full scan triggered in background"}


@router.get("/history")
async def get_scan_history(
    page: int = 1,
    page_size: int = 10,
    user: UserInfo = Depends(require_viewer),
):
    """List past scan runs."""
    container = get_scan_history_container()
    query = "SELECT * FROM c ORDER BY c.startedAt DESC OFFSET @offset LIMIT @limit"
    params = [
        {"name": "@offset", "value": (page - 1) * page_size},
        {"name": "@limit", "value": page_size},
    ]
    items = await query_items(container, query, params)
    return {"items": items, "page": page, "pageSize": page_size}


@router.get("/latest")
async def get_latest_scan(user: UserInfo = Depends(require_viewer)):
    """Get the most recent scan result."""
    container = get_scan_history_container()
    query = "SELECT TOP 1 * FROM c ORDER BY c.startedAt DESC"
    results = await query_items(container, query)
    return results[0] if results else None
