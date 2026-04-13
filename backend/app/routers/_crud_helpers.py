"""Shared CRUD helpers for item routers to reduce duplication."""

from datetime import datetime, timezone

from fastapi import HTTPException

from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, count_items
from app.services.expiration import compute_expiration_status as _compute_expiration
from app.utils.pagination import paginate


def expiry_info(expires_on_str: str | None) -> dict:
    """Parse an ISO date string and return {status, days}.
    Shared across keyvault_items, app_registrations, enterprise_apps routers.
    """
    dt = None
    if expires_on_str:
        dt = datetime.fromisoformat(expires_on_str)
    status, days = _compute_expiration(dt)
    return {"status": status, "days": days}


async def list_items_paginated(
    source_filter: str,
    conditions_extra: list[str] | None = None,
    params: list[dict] | None = None,
    search_field: str = "c.itemName",
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
    order_by: str = "c.expiresOn ASC",
):
    """Generic paginated list query for item routers."""
    container = get_items_container()
    conditions = [f"c.source = '{source_filter}'"]
    all_params = list(params or [])

    if conditions_extra:
        conditions.extend(conditions_extra)

    if search:
        conditions.append(f"CONTAINS(LOWER({search_field}), LOWER(@search))")
        all_params.append({"name": "@search", "value": search})

    where_clause = " AND ".join(conditions)

    count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
    total = await count_items(container, count_query, all_params)

    offset = (page - 1) * page_size
    data_query = f"""
        SELECT * FROM c
        WHERE {where_clause}
        ORDER BY {order_by}
        OFFSET {offset} LIMIT {page_size}
    """
    items = await query_items(container, data_query, all_params)
    return paginate(items, page, page_size, total)


async def get_item_by_id(item_id: str, source: str) -> dict:
    """Fetch a single item by ID and source."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = @source"
    params = [
        {"name": "@id", "value": item_id},
        {"name": "@source", "value": source},
    ]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    return results[0]


async def delete_item_by_id(item_id: str, source: str, default_partition: str = "") -> dict:
    """Delete an item by ID and source."""
    doc = await get_item_by_id(item_id, source)
    container = get_items_container()
    await container.delete_item(
        item=item_id,
        partition_key=doc.get("partitionKey", default_partition),
    )
    return {"status": "deleted", "id": item_id}


async def update_item_fields(
    item_id: str,
    source: str,
    updates: dict,
    field_map: dict[str, str],
    user_name: str,
) -> dict:
    """Generic update: fetch item, apply mapped fields, recompute expiry, upsert."""
    doc = await get_item_by_id(item_id, source)

    for py_key, cosmos_key in field_map.items():
        if py_key in updates:
            doc[cosmos_key] = updates[py_key]

    doc["updatedOn"] = datetime.now(timezone.utc).isoformat()
    doc["updatedBy"] = user_name

    expiry = expiry_info(doc.get("expiresOn"))
    doc["expirationStatus"] = expiry["status"]
    doc["daysUntilExpiration"] = expiry["days"]

    container = get_items_container()
    await container.upsert_item(body=doc)
    return doc
