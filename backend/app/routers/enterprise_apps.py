from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.dependencies import require_viewer, require_permission
from app.auth.rbac import Permission
from app.db.cosmos_client import get_items_container
from app.models.user import UserInfo
from app.routers._crud_helpers import expiry_info as _expiry_info, list_items_paginated, get_item_by_id, delete_item_by_id, update_item_fields

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
    conditions = []
    params = []
    if status:
        conditions.append("c.expirationStatus = @status")
        params.append({"name": "@status", "value": status})

    return await list_items_paginated(
        source_filter="enterprise_app",
        conditions_extra=conditions,
        params=params,
        search_field="c.appDisplayName",
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{item_id}")
async def get_enterprise_app(item_id: str, user: UserInfo = Depends(require_viewer)):
    return await get_item_by_id(item_id, "enterprise_app")


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
    field_map = {
        "app_display_name": "appDisplayName",
        "service_principal_id": "servicePrincipalId",
        "app_id": "appId",
        "cert_type": "certType",
        "thumbprint": "thumbprint",
        "subject": "subject",
        "expires_on": "expiresOn",
    }
    return await update_item_fields(
        item_id, "enterprise_app", body.model_dump(exclude_none=True), field_map, user.name or user.oid,
    )


@router.delete("/{item_id}")
async def delete_enterprise_app(
    item_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    return await delete_item_by_id(item_id, "enterprise_app", "entra")
