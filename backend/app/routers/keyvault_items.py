from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_viewer
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, count_items
from app.models.user import UserInfo
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/keyvault-items", tags=["keyvault-items"])


@router.get("")
async def list_keyvault_items(
    subscription: str | None = None,
    vault: str | None = None,
    item_type: str | None = Query(None, alias="type"),
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: UserInfo = Depends(require_viewer),
):
    """List Key Vault items with filtering, search, and pagination."""
    container = get_items_container()
    conditions = ["c.source = 'keyvault'"]
    params = []

    if subscription:
        conditions.append("c.subscriptionId = @subscription")
        params.append({"name": "@subscription", "value": subscription})
    if vault:
        conditions.append("c.vaultName = @vault")
        params.append({"name": "@vault", "value": vault})
    if item_type:
        conditions.append("c.itemType = @itemType")
        params.append({"name": "@itemType", "value": item_type})
    if status:
        conditions.append("c.expirationStatus = @status")
        params.append({"name": "@status", "value": status})
    if search:
        conditions.append("CONTAINS(LOWER(c.itemName), LOWER(@search))")
        params.append({"name": "@search", "value": search})

    where_clause = " AND ".join(conditions)

    # Get total count
    count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
    total = await count_items(container, count_query, params)

    # Get paginated results
    offset = (page - 1) * page_size
    data_query = f"""
        SELECT * FROM c
        WHERE {where_clause}
        ORDER BY c.expiresOn ASC
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, data_query, params)

    return paginate(items, page, page_size, total)


@router.get("/subscriptions")
async def list_subscriptions(user: UserInfo = Depends(require_viewer)):
    """Distinct subscription list for filter dropdowns."""
    container = get_items_container()
    query = """
        SELECT DISTINCT c.subscriptionId, c.subscriptionName
        FROM c
        WHERE c.source = 'keyvault'
    """
    return await query_items(container, query)


@router.get("/vaults")
async def list_vaults(
    subscription: str | None = None,
    user: UserInfo = Depends(require_viewer),
):
    """Distinct vault list, optionally filtered by subscription."""
    container = get_items_container()
    if subscription:
        query = """
            SELECT DISTINCT c.vaultName, c.vaultUri
            FROM c
            WHERE c.source = 'keyvault' AND c.subscriptionId = @sub
        """
        params = [{"name": "@sub", "value": subscription}]
        return await query_items(container, query, params)
    else:
        query = """
            SELECT DISTINCT c.vaultName, c.vaultUri
            FROM c
            WHERE c.source = 'keyvault'
        """
        return await query_items(container, query)


@router.get("/{item_id}")
async def get_keyvault_item(item_id: str, user: UserInfo = Depends(require_viewer)):
    """Get a single Key Vault item by ID."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'keyvault'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return results[0]
