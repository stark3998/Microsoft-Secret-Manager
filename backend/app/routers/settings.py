from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin
from app.db.cosmos_client import get_settings_container
from app.db.queries import query_items
from app.models.user import UserInfo

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def _get_setting(setting_id: str) -> dict:
    container = get_settings_container()
    results = await query_items(
        container,
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": setting_id}],
    )
    return results[0] if results else {}


async def _update_setting(setting_id: str, updates: dict, user: UserInfo) -> dict:
    container = get_settings_container()
    doc = await _get_setting(setting_id)
    doc.update(updates)
    doc["updatedBy"] = user.email
    doc["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return await container.upsert_item(body=doc)


@router.get("")
async def get_all_settings(user: UserInfo = Depends(require_admin)):
    """Get all application settings."""
    thresholds = await _get_setting("thresholds")
    notifications = await _get_setting("notifications")
    schedule = await _get_setting("schedule")
    saml_rotation = await _get_setting("saml_rotation")
    return {
        "thresholds": thresholds,
        "notifications": notifications,
        "schedule": schedule,
        "samlRotation": saml_rotation,
    }


@router.put("/thresholds")
async def update_thresholds(body: dict, user: UserInfo = Depends(require_admin)):
    """Update expiration threshold tiers."""
    return await _update_setting("thresholds", {"tiers": body.get("tiers", [])}, user)


@router.put("/notifications")
async def update_notifications(body: dict, user: UserInfo = Depends(require_admin)):
    """Update notification configuration."""
    allowed_keys = [
        "emailEnabled", "emailRecipients", "emailFrom",
        "teamsEnabled", "teamsWebhookUrl",
        "notifyOnStatusChange", "dailyDigestEnabled", "dailyDigestTime",
    ]
    updates = {k: v for k, v in body.items() if k in allowed_keys}
    return await _update_setting("notifications", updates, user)


@router.get("/saml-rotation")
async def get_saml_rotation_settings(user: UserInfo = Depends(require_admin)):
    """Get SAML certificate rotation configuration."""
    return await _get_setting("saml_rotation")


@router.put("/saml-rotation")
async def update_saml_rotation_settings(body: dict, user: UserInfo = Depends(require_admin)):
    """Update SAML certificate rotation configuration."""
    allowed_keys = [
        "enabled", "triggerDays", "activationGraceDays", "cleanupGraceDays",
        "autoActivate", "excludedServicePrincipals", "spMetadataRefreshCapable",
    ]
    updates = {k: v for k, v in body.items() if k in allowed_keys}
    return await _update_setting("saml_rotation", updates, user)


@router.put("/schedule")
async def update_schedule(body: dict, user: UserInfo = Depends(require_admin)):
    """Update scan schedule configuration."""
    allowed_keys = ["cronExpression", "enabled", "subscriptionFilter"]
    updates = {k: v for k, v in body.items() if k in allowed_keys}
    result = await _update_setting("schedule", updates, user)

    # Reschedule the background job if cron changed
    if "cronExpression" in updates:
        from app.services.scheduler import reschedule_scan
        reschedule_scan(updates["cronExpression"])

    return result
