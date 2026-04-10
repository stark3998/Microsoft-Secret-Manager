import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, Query, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_viewer, require_permission
from app.auth.rbac import Permission
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, count_items, upsert_item
from app.models.user import UserInfo
from app.services.inventory.graph_operations import (
    _get_graph_token,
    disable_service_principal,
    enable_service_principal,
    fetch_sign_in_details,
    fetch_app_graph_raw,
)
from app.utils.pagination import paginate

logger = logging.getLogger(__name__)


async def _resolve_graph_token(x_graph_token: str | None = Header(None)) -> str:
    """Get a Graph API token — prefer the user-delegated token passed by the frontend,
    fall back to DefaultAzureCredential for service-principal environments."""
    if x_graph_token:
        return x_graph_token
    return await _get_graph_token()

router = APIRouter(prefix="/api/app-inventory", tags=["app-inventory"])


# ---------------------------------------------------------------------------
# List / filter / sort
# ---------------------------------------------------------------------------

@router.get("")
async def list_app_inventory(
    classification: str | None = None,
    search: str | None = None,
    sort_by: str = "activityClassification",
    sort_order: str = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: UserInfo = Depends(require_viewer),
):
    """List app inventory records with filtering, search, and pagination."""
    container = get_items_container()
    conditions = ["c.itemType = 'app_inventory'"]
    params = []

    if classification:
        conditions.append("c.activityClassification = @classification")
        params.append({"name": "@classification", "value": classification})
    if search:
        conditions.append(
            "(CONTAINS(LOWER(c.appDisplayName), LOWER(@search)) "
            "OR CONTAINS(LOWER(c.appId), LOWER(@search)))"
        )
        params.append({"name": "@search", "value": search})

    where_clause = " AND ".join(conditions)

    # Validate sort field
    allowed_sorts = {
        "activityClassification", "signInCount30d", "nearestExpiry",
        "appDisplayName", "lastSignInAt", "uniqueUsers30d",
    }
    if sort_by not in allowed_sorts:
        sort_by = "activityClassification"
    order = "DESC" if sort_order.lower() == "desc" else "ASC"

    count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
    total = await count_items(container, count_query, params)

    offset = (page - 1) * page_size
    data_query = f"""
        SELECT * FROM c
        WHERE {where_clause}
        ORDER BY c.{sort_by} {order}
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, data_query, params)

    return paginate(items, page, page_size, total)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@router.get("/summary")
async def get_inventory_summary(user: UserInfo = Depends(require_viewer)):
    """Aggregate counts by activity classification."""
    container = get_items_container()
    query = """
        SELECT c.activityClassification, COUNT(1) as count
        FROM c
        WHERE c.itemType = 'app_inventory'
        GROUP BY c.activityClassification
    """
    results = await query_items(container, query)

    summary = {"total": 0, "active": 0, "lowActivity": 0, "inactive": 0, "zombie": 0, "disabled": 0}
    key_map = {
        "active": "active",
        "low_activity": "lowActivity",
        "inactive": "inactive",
        "zombie": "zombie",
        "disabled": "disabled",
    }
    for row in results:
        cls = row.get("activityClassification", "")
        count = row.get("count", 0)
        summary["total"] += count
        if cls in key_map:
            summary[key_map[cls]] = count

    return summary


# ---------------------------------------------------------------------------
# Single app detail
# ---------------------------------------------------------------------------

@router.get("/actions/history")
async def list_actions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: UserInfo = Depends(require_viewer),
):
    """List disable/enable action history."""
    container = get_items_container()
    count_query = "SELECT VALUE COUNT(1) FROM c WHERE c.itemType = 'disable_action'"
    total = await count_items(container, count_query)

    offset = (page - 1) * page_size
    query = f"""
        SELECT * FROM c
        WHERE c.itemType = 'disable_action'
        ORDER BY c.initiatedAt DESC
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, query)
    return paginate(items, page, page_size, total)


# ---------------------------------------------------------------------------
# Live sign-in details (on-demand Graph query)
# ---------------------------------------------------------------------------

@router.get("/{app_id}/sign-ins")
async def get_app_sign_ins(
    app_id: str,
    days: int = Query(30, ge=1, le=90),
    user: UserInfo = Depends(require_viewer),
    token: str = Depends(_resolve_graph_token),
):
    """Fetch recent sign-in logs for a specific app from Graph API."""
    try:
        sign_ins = await fetch_sign_in_details(token, app_id, days)
        return {"items": sign_ins, "count": len(sign_ins), "appId": app_id}
    except Exception as e:
        logger.exception(f"Failed to fetch sign-ins for {app_id}")
        raise HTTPException(status_code=502, detail=f"Graph API error: {e}")


# ---------------------------------------------------------------------------
# Raw Graph API response (debug / transparency view)
# ---------------------------------------------------------------------------

@router.get("/{app_id}/graph-raw")
async def get_app_graph_raw(
    app_id: str,
    user: UserInfo = Depends(require_viewer),
    token: str = Depends(_resolve_graph_token),
):
    """Fetch raw Graph API responses for an app (registration, SP, activity)."""
    try:
        return await fetch_app_graph_raw(token, app_id)
    except Exception as e:
        logger.exception(f"Failed to fetch graph-raw for {app_id}")
        raise HTTPException(status_code=502, detail=f"Graph API error: {e}")


# ---------------------------------------------------------------------------
# Single app detail (must be AFTER sub-routes to avoid catching them)
# ---------------------------------------------------------------------------

@router.get("/{app_id}")
async def get_app_detail(app_id: str, user: UserInfo = Depends(require_viewer)):
    """Get a single app inventory record by appId."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'app_inventory'"
    params = [{"name": "@id", "value": f"inventory-{app_id}"}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="App not found in inventory")
    return results[0]


# ---------------------------------------------------------------------------
# Disable / Enable
# ---------------------------------------------------------------------------

class BulkDisableRequest(BaseModel):
    app_ids: list[str]


@router.post("/{app_id}/disable")
async def disable_app(
    app_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Disable an app's service principal."""
    container = get_items_container()

    # Look up inventory record
    query = "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'app_inventory'"
    params = [{"name": "@id", "value": f"inventory-{app_id}"}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="App not found in inventory")

    record = results[0]
    sp_id = record.get("servicePrincipalId")
    if not sp_id:
        raise HTTPException(
            status_code=400,
            detail="No service principal found for this app. Cannot disable.",
        )

    now = datetime.now(timezone.utc)

    # Create audit action
    action_doc = {
        "id": f"disable-action-{uuid.uuid4()}",
        "partitionKey": "inventory",
        "itemType": "disable_action",
        "appId": app_id,
        "servicePrincipalId": sp_id,
        "appDisplayName": record.get("appDisplayName", ""),
        "state": "pending",
        "previousEnabledState": record.get("accountEnabled", True),
        "initiatedAt": now.isoformat(),
        "initiatedBy": user.name or user.oid,
        "completedAt": None,
        "failedAt": None,
        "failureReason": "",
        "revertedAt": None,
        "revertedBy": "",
        "history": [{"action": "initiated", "at": now.isoformat(), "by": user.name or user.oid}],
    }

    try:
        await disable_service_principal(sp_id)
        action_doc["state"] = "completed"
        action_doc["completedAt"] = datetime.now(timezone.utc).isoformat()
        action_doc["history"].append({"action": "completed", "at": action_doc["completedAt"]})

        # Update inventory record
        record["accountEnabled"] = False
        record["activityClassification"] = "disabled"
        await upsert_item(container, record)

    except Exception as e:
        action_doc["state"] = "failed"
        action_doc["failedAt"] = datetime.now(timezone.utc).isoformat()
        action_doc["failureReason"] = str(e)
        action_doc["history"].append({"action": "failed", "at": action_doc["failedAt"], "details": str(e)})
        await upsert_item(container, action_doc)
        raise HTTPException(status_code=500, detail=f"Failed to disable service principal: {e}")

    await upsert_item(container, action_doc)
    return action_doc


@router.post("/{app_id}/enable")
async def enable_app(
    app_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Re-enable an app's service principal."""
    container = get_items_container()

    query = "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'app_inventory'"
    params = [{"name": "@id", "value": f"inventory-{app_id}"}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="App not found in inventory")

    record = results[0]
    sp_id = record.get("servicePrincipalId")
    if not sp_id:
        raise HTTPException(status_code=400, detail="No service principal found for this app.")

    now = datetime.now(timezone.utc)

    try:
        await enable_service_principal(sp_id)

        # Update inventory record
        record["accountEnabled"] = True
        record["activityClassification"] = "inactive"  # will be reclassified on next scan
        await upsert_item(container, record)

        # Find and update the latest disable action for this app
        action_query = (
            "SELECT * FROM c WHERE c.itemType = 'disable_action' "
            "AND c.appId = @appId AND c.state = 'completed' "
            "ORDER BY c.initiatedAt DESC"
        )
        action_params = [{"name": "@appId", "value": app_id}]
        actions = await query_items(container, action_query, action_params)
        if actions:
            action = actions[0]
            action["state"] = "reverted"
            action["revertedAt"] = now.isoformat()
            action["revertedBy"] = user.name or user.oid
            action["history"].append({
                "action": "reverted", "at": now.isoformat(), "by": user.name or user.oid,
            })
            await upsert_item(container, action)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enable service principal: {e}")

    return {"status": "enabled", "appId": app_id, "servicePrincipalId": sp_id}


@router.post("/bulk-disable")
async def bulk_disable_apps(
    body: BulkDisableRequest,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Disable multiple apps' service principals at once."""
    results = []
    for app_id in body.app_ids:
        try:
            result = await disable_app(app_id, user)
            results.append({"appId": app_id, "status": "disabled", "action": result})
        except HTTPException as e:
            results.append({"appId": app_id, "status": "failed", "error": e.detail})
    return {"results": results, "total": len(body.app_ids)}
