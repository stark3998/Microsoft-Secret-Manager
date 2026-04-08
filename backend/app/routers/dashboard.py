from fastapi import APIRouter, Depends

from app.auth.dependencies import require_viewer
from app.db.cosmos_client import get_items_container, get_settings_container
from app.db.queries import query_items
from app.models.user import UserInfo

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview")
async def get_overview(user: UserInfo = Depends(require_viewer)):
    """Dashboard overview: total counts, expired, expiring by status tier."""
    container = get_items_container()

    # Total count
    total_result = await query_items(
        container, "SELECT VALUE COUNT(1) FROM c"
    )
    total = total_result[0] if total_result else 0

    # Counts by expiration status
    status_query = """
        SELECT c.expirationStatus, COUNT(1) as count
        FROM c
        GROUP BY c.expirationStatus
    """
    status_results = await query_items(container, status_query)
    status_counts = {r["expirationStatus"]: r["count"] for r in status_results}

    # Counts by source
    source_query = """
        SELECT c.source, COUNT(1) as count
        FROM c
        GROUP BY c.source
    """
    source_results = await query_items(container, source_query)
    source_counts = {r["source"]: r["count"] for r in source_results}

    # Counts by item type
    type_query = """
        SELECT c.itemType, COUNT(1) as count
        FROM c
        GROUP BY c.itemType
    """
    type_results = await query_items(container, type_query)
    type_counts = {r["itemType"]: r["count"] for r in type_results}

    return {
        "total": total,
        "byStatus": status_counts,
        "bySource": source_counts,
        "byType": type_counts,
    }


@router.get("/timeline")
async def get_timeline(months: int = 12, user: UserInfo = Depends(require_viewer)):
    """Items grouped by expiration month for the timeline/calendar view."""
    container = get_items_container()

    query = """
        SELECT c.id, c.itemName, c.itemType, c.source, c.vaultName,
               c.appDisplayName, c.expiresOn, c.expirationStatus,
               c.daysUntilExpiration, c.subscriptionName
        FROM c
        WHERE c.expiresOn != null
        ORDER BY c.expiresOn ASC
    """
    items = await query_items(container, query)

    return {"items": items, "count": len(items)}
