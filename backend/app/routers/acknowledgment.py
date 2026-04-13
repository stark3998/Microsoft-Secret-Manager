"""Acknowledgment and snooze API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models.user import UserInfo
from app.services.acknowledgment import acknowledge_item, snooze_item, unacknowledge_item
from app.services.audit import record_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/items", tags=["acknowledgment"])


class AcknowledgeRequest(BaseModel):
    item_id: str
    partition_key: str
    note: str = ""


class SnoozeRequest(BaseModel):
    item_id: str
    partition_key: str
    snooze_days: int = 30
    note: str = ""


@router.post("/acknowledge")
async def acknowledge(
    request: AcknowledgeRequest,
    user: UserInfo = Depends(require_permission(Permission.ACKNOWLEDGE_ITEM)),
):
    """Acknowledge an expiring item."""
    try:
        item = await acknowledge_item(
            item_id=request.item_id,
            partition_key=request.partition_key,
            acknowledged_by=user.name or user.oid,
            note=request.note,
        )
        await record_audit_event("item.acknowledge", user, "credential", request.item_id, request.item_id, {"note": request.note})
        return {"status": "acknowledged", "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/snooze")
async def snooze(
    request: SnoozeRequest,
    user: UserInfo = Depends(require_permission(Permission.ACKNOWLEDGE_ITEM)),
):
    """Snooze notifications for an item."""
    try:
        item = await snooze_item(
            item_id=request.item_id,
            partition_key=request.partition_key,
            snoozed_by=user.name or user.oid,
            snooze_days=request.snooze_days,
            note=request.note,
        )
        await record_audit_event("item.snooze", user, "credential", request.item_id, request.item_id, {"snooze_days": request.snooze_days, "note": request.note})
        return {"status": "snoozed", "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/unacknowledge")
async def unacknowledge(
    request: AcknowledgeRequest,
    user: UserInfo = Depends(require_permission(Permission.ACKNOWLEDGE_ITEM)),
):
    """Remove acknowledgment from an item."""
    try:
        item = await unacknowledge_item(
            item_id=request.item_id,
            partition_key=request.partition_key,
        )
        await record_audit_event("item.unacknowledge", user, "credential", request.item_id, request.item_id)
        return {"status": "unacknowledged", "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
