from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_viewer, require_permission
from app.auth.rbac import Permission
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, count_items
from app.models.user import UserInfo
from app.services.expiration import compute_expiration_status as _compute_expiration
from app.utils.pagination import paginate


def _expiry_info(expires_on_str: str | None) -> dict:
    """Parse an ISO date string and return {status, days}."""
    dt = None
    if expires_on_str:
        dt = datetime.fromisoformat(expires_on_str)
    status, days = _compute_expiration(dt)
    return {"status": status, "days": days}

router = APIRouter(prefix="/api/keyvault-items", tags=["keyvault-items"])


class KeyVaultItemCreate(BaseModel):
    item_type: str  # secret | key | certificate
    subscription_id: str = ""
    subscription_name: str = ""
    resource_group: str = ""
    vault_name: str
    vault_uri: str = ""
    item_name: str
    item_version: str = ""
    enabled: bool = True
    expires_on: str | None = None
    not_before_date: str | None = None
    tags: dict[str, str] = {}


class KeyVaultItemUpdate(BaseModel):
    item_name: str | None = None
    item_type: str | None = None
    subscription_id: str | None = None
    subscription_name: str | None = None
    resource_group: str | None = None
    vault_name: str | None = None
    vault_uri: str | None = None
    item_version: str | None = None
    enabled: bool | None = None
    expires_on: str | None = None
    not_before_date: str | None = None
    tags: dict[str, str] | None = None


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
        raise HTTPException(status_code=404, detail="Item not found")
    return results[0]


@router.post("")
async def create_keyvault_item(
    body: KeyVaultItemCreate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Create a new Key Vault item."""
    container = get_items_container()
    now = datetime.now(timezone.utc).isoformat()
    item_id = f"kv-{body.vault_name}-{body.item_type}-{body.item_name}".lower()

    expiry = _expiry_info(body.expires_on)

    doc = {
        "id": item_id,
        "partitionKey": body.subscription_id or "manual",
        "itemType": body.item_type,
        "source": "keyvault",
        "subscriptionId": body.subscription_id,
        "subscriptionName": body.subscription_name,
        "resourceGroup": body.resource_group,
        "vaultName": body.vault_name,
        "vaultUri": body.vault_uri,
        "itemName": body.item_name,
        "itemVersion": body.item_version,
        "enabled": body.enabled,
        "expiresOn": body.expires_on,
        "createdOn": now,
        "updatedOn": now,
        "notBeforeDate": body.not_before_date,
        "tags": body.tags,
        "expirationStatus": expiry["status"],
        "daysUntilExpiration": expiry["days"],
        "lastScannedAt": None,
        "scanRunId": "",
        "createdBy": user.name or user.oid,
    }
    await container.upsert_item(body=doc)
    return doc


@router.put("/{item_id}")
async def update_keyvault_item(
    item_id: str,
    body: KeyVaultItemUpdate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Update an existing Key Vault item."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'keyvault'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")

    doc = results[0]
    updates = body.model_dump(exclude_none=True)

    field_map = {
        "item_name": "itemName",
        "item_type": "itemType",
        "subscription_id": "subscriptionId",
        "subscription_name": "subscriptionName",
        "resource_group": "resourceGroup",
        "vault_name": "vaultName",
        "vault_uri": "vaultUri",
        "item_version": "itemVersion",
        "enabled": "enabled",
        "expires_on": "expiresOn",
        "not_before_date": "notBeforeDate",
        "tags": "tags",
    }
    for py_key, cosmos_key in field_map.items():
        if py_key in updates:
            doc[cosmos_key] = updates[py_key]

    doc["updatedOn"] = datetime.now(timezone.utc).isoformat()
    doc["updatedBy"] = user.name or user.oid

    expiry = _expiry_info(doc.get("expiresOn"))
    doc["expirationStatus"] = expiry["status"]
    doc["daysUntilExpiration"] = expiry["days"]

    await container.upsert_item(body=doc)
    return doc


@router.delete("/{item_id}")
async def delete_keyvault_item(
    item_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Delete a Key Vault item."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'keyvault'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = results[0]
    await container.delete_item(item=item_id, partition_key=doc.get("partitionKey", ""))
    return {"status": "deleted", "id": item_id}
