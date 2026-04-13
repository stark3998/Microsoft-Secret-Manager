"""Audit log API endpoints."""

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_admin
from app.db.cosmos_client import get_audit_log_container
from app.db.queries import query_items, count_items
from app.models.user import UserInfo
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/audit-log", tags=["audit-log"])


@router.get("")
async def list_audit_logs(
    action: str | None = None,
    user_id: str | None = None,
    resource_type: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    admin: UserInfo = Depends(require_admin),
):
    """List audit log entries with filtering and pagination. Admin only."""
    container = get_audit_log_container()
    conditions = ["1=1"]
    params = []

    if action:
        conditions.append("c.action = @action")
        params.append({"name": "@action", "value": action})
    if user_id:
        conditions.append("c.userId = @userId")
        params.append({"name": "@userId", "value": user_id})
    if resource_type:
        conditions.append("c.resourceType = @resourceType")
        params.append({"name": "@resourceType", "value": resource_type})
    if search:
        conditions.append(
            "(CONTAINS(LOWER(c.resourceName), LOWER(@search)) OR CONTAINS(LOWER(c.userName), LOWER(@search)))"
        )
        params.append({"name": "@search", "value": search})

    where_clause = " AND ".join(conditions)
    count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
    total = await count_items(container, count_query, params)

    offset = (page - 1) * page_size
    data_query = f"""
        SELECT * FROM c
        WHERE {where_clause}
        ORDER BY c.timestamp DESC
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, data_query, params)
    return paginate(items, page, page_size, total)
