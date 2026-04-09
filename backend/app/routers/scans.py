import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel

from app.auth.dependencies import require_admin, require_viewer
from app.db.cosmos_client import get_scan_history_container
from app.db.queries import query_items
from app.models.user import UserInfo

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
    """
    from app.services.scanner.orchestrator import run_full_scan

    credential = None
    if body.delegatedTokens:
        from app.utils.azure_credential import DelegatedTokenCredential
        tokens = body.delegatedTokens.model_dump(exclude_none=True)
        if tokens:
            credential = DelegatedTokenCredential(tokens)
            logger.info(f"Scan triggered with delegated credentials by {user.email} "
                        f"(resources: {list(tokens.keys())})")

    background_tasks.add_task(run_full_scan, triggered_by=user.email, credential=credential)
    mode = "delegated" if credential else "service_principal"
    return {"status": "started", "message": f"Full scan triggered in background ({mode} credentials)"}


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
