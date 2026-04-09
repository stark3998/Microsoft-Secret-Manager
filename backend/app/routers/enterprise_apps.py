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


router = APIRouter(prefix="/api/enterprise-apps", tags=["enterprise-apps"])


class EnterpriseAppCreate(BaseModel):
    service_principal_id: str = ""
    app_id: str = ""
    app_display_name: str
    cert_type: str = "signing"  # signing | encryption
    thumbprint: str = ""
    subject: str = ""
    expires_on: str | None = None


class EnterpriseAppUpdate(BaseModel):
    app_display_name: str | None = None
    service_principal_id: str | None = None
    app_id: str | None = None
    cert_type: str | None = None
    thumbprint: str | None = None
    subject: str | None = None
    expires_on: str | None = None


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


@router.post("")
async def create_enterprise_app(
    body: EnterpriseAppCreate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Create a new Enterprise App certificate."""
    container = get_items_container()
    now = datetime.now(timezone.utc).isoformat()
    item_id = f"ea-{body.app_display_name}-{body.cert_type}-{body.thumbprint or now}".lower().replace(" ", "-")

    expiry = _expiry_info(body.expires_on)

    doc = {
        "id": item_id,
        "partitionKey": "entra",
        "itemType": "saml_certificate",
        "source": "enterprise_app",
        "servicePrincipalId": body.service_principal_id,
        "appId": body.app_id,
        "appDisplayName": body.app_display_name,
        "certType": body.cert_type,
        "thumbprint": body.thumbprint,
        "subject": body.subject,
        "expiresOn": body.expires_on,
        "createdOn": now,
        "expirationStatus": expiry["status"],
        "daysUntilExpiration": expiry["days"],
        "lastScannedAt": None,
        "scanRunId": "",
        "createdBy": user.name or user.oid,
    }
    await container.upsert_item(body=doc)
    return doc


@router.put("/{item_id}")
async def update_enterprise_app(
    item_id: str,
    body: EnterpriseAppUpdate,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Update an existing Enterprise App certificate."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'enterprise_app'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")

    doc = results[0]
    updates = body.model_dump(exclude_none=True)

    field_map = {
        "app_display_name": "appDisplayName",
        "service_principal_id": "servicePrincipalId",
        "app_id": "appId",
        "cert_type": "certType",
        "thumbprint": "thumbprint",
        "subject": "subject",
        "expires_on": "expiresOn",
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
async def delete_enterprise_app(
    item_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    """Delete an Enterprise App certificate."""
    container = get_items_container()
    query = "SELECT * FROM c WHERE c.id = @id AND c.source = 'enterprise_app'"
    params = [{"name": "@id", "value": item_id}]
    results = await query_items(container, query, params)
    if not results:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = results[0]
    await container.delete_item(item=item_id, partition_key=doc.get("partitionKey", "entra"))
    return {"status": "deleted", "id": item_id}
