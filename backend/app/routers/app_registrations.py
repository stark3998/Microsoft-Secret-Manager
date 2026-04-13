from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.dependencies import require_viewer, require_permission
from app.auth.rbac import Permission
from app.db.cosmos_client import get_items_container
from app.models.user import UserInfo
from app.routers._crud_helpers import expiry_info as _expiry_info, list_items_paginated, get_item_by_id, delete_item_by_id, update_item_fields

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
    conditions = []
    params = []
    if status:
        conditions.append("c.expirationStatus = @status")
        params.append({"name": "@status", "value": status})

    return await list_items_paginated(
        source_filter="app_registration",
        conditions_extra=conditions,
        params=params,
        search_field="c.appDisplayName",
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{item_id}")
async def get_app_registration(item_id: str, user: UserInfo = Depends(require_viewer)):
    return await get_item_by_id(item_id, "app_registration")


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
    return await update_item_fields(
        item_id, "app_registration", body.model_dump(exclude_none=True), field_map, user.name or user.oid,
    )


@router.delete("/{item_id}")
async def delete_app_registration(
    item_id: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_CREDENTIALS)),
):
    return await delete_item_by_id(item_id, "app_registration", "entra")
