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
    dt = None
    if expires_on_str:
        dt = datetime.fromisoformat(expires_on_str)
    status, days = _compute_expiration(dt)
    return {"status": status, "days": days}


router = APIRouter(prefix="/api/app-registrations", tags=["app-registrations"])


class AppRegistrationCreate(BaseModel):
    item_type: str  # client_secret | certificate
    app_object_id: str = ""
    app_id: str = ""
    app_display_name: str
    credential_id: str = ""
    credential_display_name: str = ""
    expires_on: str | None = None
    thumbprint: str | None = None
    subject: str | None = None


class AppRegistrationUpdate(BaseModel):
    app_display_name: str | None = None
    item_type: str | None = None
    app_object_id: str | None = None
    app_id: str | None = None
    credential_id: str | None = None
    credential_display_name: str | None = None
    expires_on: str | None = None
    thumbprint: str | None = None
    subject: str | None = None


@router.get("")
async def list_app_registrations(
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: UserInfo = Depends(require_viewer),
):
    """List App Registration credentials with filtering and pagination."""
    container = get_items_container()
    conditions = ["c.source = 'app_registration'"]
    params = []

    if status:
        conditions.append("c.expirationStatus = @status")
        params.append({"name": "@status", "value": status})
    if search:
        conditions.append(
            "(CONTAINS(LOWER(c.appDisplayName), LOWER(@search)) OR CONTAINS(LOWER(c.credentialDisplayName), LOWER(@search)))"
        )
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
async def get_app_registration(item_id: str, user: UserInfo = Depends(require_viewer)):
    """Get a single App Registration credential by ID."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'app_registration'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    return results[0]


@router.post("")
async def create_app_registration(
    body: AppRegistrationCreate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Create a new App Registration credential."""
    container = get_items_container()
    now = datetime.now(timezone.utc).isoformat()
    item_id = f"ar-{body.app_display_name}-{body.item_type}-{body.credential_display_name or now}".lower().replace(" ", "-")

    expiry = _expiry_info(body.expires_on)

    doc = {
        "id": item_id,
        "partitionKey": "entra",
        "itemType": body.item_type,
        "source": "app_registration",
        "appObjectId": body.app_object_id,
        "appId": body.app_id,
        "appDisplayName": body.app_display_name,
        "credentialId": body.credential_id,
        "credentialDisplayName": body.credential_display_name,
        "expiresOn": body.expires_on,
        "createdOn": now,
        "thumbprint": body.thumbprint,
        "subject": body.subject,
        "expirationStatus": expiry["status"],
        "daysUntilExpiration": expiry["days"],
        "lastScannedAt": None,
        "scanRunId": "",
        "createdBy": user.name or user.oid,
    }
    await container.upsert_item(body=doc)
    return doc


@router.put("/{item_id}")
async def update_app_registration(
    item_id: str,
    body: AppRegistrationUpdate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Update an existing App Registration credential."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'app_registration'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")

    doc = results[0]
    updates = body.model_dump(exclude_none=True)

    field_map = {
        "app_display_name": "appDisplayName",
        "item_type": "itemType",
        "app_object_id": "appObjectId",
        "app_id": "appId",
        "credential_id": "credentialId",
        "credential_display_name": "credentialDisplayName",
        "expires_on": "expiresOn",
        "thumbprint": "thumbprint",
        "subject": "subject",
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
async def delete_app_registration(
    item_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Delete an App Registration credential."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'app_registration'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = results[0]
    await container.delete_item(item=item_id, partition_key=doc.get("partitionKey", "entra"))
    return {"status": "deleted", "id": item_id}
