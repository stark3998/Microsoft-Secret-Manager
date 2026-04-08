from fastapi import APIRouter, Depends, Query, HTTPException

from app.auth.dependencies import require_viewer
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, count_items
from app.models.user import UserInfo
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/enterprise-apps", tags=["enterprise-apps"])


@router.get("")
async def list_enterprise_apps(
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: UserInfo = Depends(require_viewer),
):
    """List Enterprise App certificates with filtering and pagination."""
    container = get_items_container()
    conditions = ["c.source = 'enterprise_app'"]
    params = []

    if status:
        conditions.append("c.expirationStatus = @status")
        params.append({"name": "@status", "value": status})
    if search:
        conditions.append("CONTAINS(LOWER(c.appDisplayName), LOWER(@search))")
        params.append({"name": "@search", "value": search})

    where_clause = " AND ".join(conditions)

    count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
    total = await count_items(container, count_query, params)

    offset = (page - 1) * page_size
    data_query = f"""
        SELECT * FROM c
        WHERE {where_clause}
        ORDER BY c.expiresOn ASC
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, data_query, params)

    return paginate(items, page, page_size, total)


@router.get("/{item_id}")
async def get_enterprise_app(item_id: str, user: UserInfo = Depends(require_viewer)):
    """Get a single Enterprise App certificate by ID."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'enterprise_app'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    return results[0]
