import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth.dependencies import require_admin, require_viewer
from app.db.cosmos_client import get_scan_history_container
from app.db.queries import count_items, query_items
from app.models.user import UserInfo
from app.services.scanner.event_bus import ScanEventBus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scans", tags=["scans"])


class DelegatedTokens(BaseModel):
    """Tokens acquired by the frontend via MSAL for user-delegated scanning."""
    graph: Optional[str] = None
    management: Optional[str] = None
    keyvault: Optional[str] = None


class ScanTriggerBody(BaseModel):
    delegatedTokens: Optional[DelegatedTokens] = None


@router.post("/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    body: ScanTriggerBody = ScanTriggerBody(),
    user: UserInfo = Depends(require_admin),
):
    """Trigger an immediate full scan.

    Optionally accepts delegated tokens to scan using the logged-in user's
    permissions instead of the service principal.

    Returns the scan ID so the client can connect to the SSE stream.
    """
    from app.services.scanner.orchestrator import run_full_scan

    scan_id = str(uuid.uuid4())

    credential = None
    if body.delegatedTokens:
        from app.utils.azure_credential import DelegatedTokenCredential
        tokens = body.delegatedTokens.model_dump(exclude_none=True)
        if tokens:
            credential = DelegatedTokenCredential(tokens)
            logger.info(f"Scan triggered with delegated credentials by {user.email} "
                        f"(resources: {list(tokens.keys())})")

    # Create the event bus before starting the background task so SSE clients
    # can subscribe immediately and not miss early events.
    ScanEventBus.create(scan_id)

    background_tasks.add_task(run_full_scan, triggered_by=user.email, credential=credential, scan_id=scan_id)
    mode = "delegated" if credential else "service_principal"
    return {
        "status": "started",
        "scanId": scan_id,
        "message": f"Full scan triggered in background ({mode} credentials)",
    }


@router.get("/active")
async def get_active_scan(user: UserInfo = Depends(require_viewer)):
    """Return the currently running scan ID, if any."""
    scan_id = ScanEventBus.get_active_scan_id()
    if scan_id:
        return {"scanId": scan_id, "active": True}
    return {"scanId": None, "active": False}


@router.get("/stream/{scan_id}")
async def stream_scan_logs(scan_id: str, request: Request, user: UserInfo = Depends(require_viewer)):
    """SSE endpoint that streams real-time scan progress events.

    Replays buffered history for late-joining clients, then streams live events.
    Closes when the scan completes or the client disconnects.
    """
    bus = ScanEventBus.get(scan_id)
    if not bus:
        return StreamingResponse(
            iter([f"data: {json.dumps({'type': 'error', 'message': 'Scan not found or already cleaned up'})}\n\n"]),
            media_type="text/event-stream",
        )

    queue = bus.subscribe()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent proxy/browser timeouts
                    yield ": keepalive\n\n"
                    continue

                if event is None:
                    break  # scan completed

                yield f"data: {json.dumps(event.to_dict())}\n\n"
        finally:
            bus.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def get_scan_history(
    page: int = 1,
    page_size: int = 10,
    user: UserInfo = Depends(require_viewer),
):
    """List past scan runs."""
    container = get_scan_history_container()

    # Get total count
    total = await count_items(container, "SELECT VALUE COUNT(1) FROM c")

    query = "SELECT * FROM c ORDER BY c.startedAt DESC OFFSET @offset LIMIT @limit"
    params = [
        {"name": "@offset", "value": (page - 1) * page_size},
        {"name": "@limit", "value": page_size},
    ]
    items = await query_items(container, query, params)
    return {"items": items, "page": page, "pageSize": page_size, "total": total}


@router.get("/latest")
async def get_latest_scan(user: UserInfo = Depends(require_viewer)):
    """Get the most recent scan result."""
    container = get_scan_history_container()
    query = "SELECT TOP 1 * FROM c ORDER BY c.startedAt DESC"
    results = await query_items(container, query)
    return results[0] if results else None
