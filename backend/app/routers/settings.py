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


# ---------------------------------------------------------------------------
# App Config (Environment / Cosmos DB)
# ---------------------------------------------------------------------------

_SENSITIVE_MASK = "********"

_APP_CONFIG_ALLOWED_KEYS = [
    "storageMode",
    "azureTenantId", "azureClientId", "azureClientSecret",
    "azureEnvironment", "managedIdentityClientId", "msalClientId",
    "cosmosEndpoint", "cosmosDatabase",
]

_FIELD_MAP = {
    "azureTenantId": "azure_tenant_id",
    "azureClientId": "azure_client_id",
    "azureClientSecret": "azure_client_secret",
    "azureEnvironment": "azure_environment",
    "managedIdentityClientId": "managed_identity_client_id",
    "msalClientId": "msal_client_id",
}


@router.get("/app-config")
async def get_app_config(user: UserInfo = Depends(require_admin)):
    """Get application environment configuration."""
    from app.config import settings as app_settings

    doc = await _get_setting("app_config")

    if not doc:
        # Fallback: build from in-memory settings (env-var-only deployment)
        doc = {
            "storageMode": app_settings.storage_mode,
            "azureTenantId": app_settings.azure_tenant_id,
            "azureClientId": app_settings.azure_client_id,
            "azureClientSecret": app_settings.azure_client_secret,
            "azureEnvironment": app_settings.azure_environment,
            "managedIdentityClientId": app_settings.managed_identity_client_id,
            "msalClientId": app_settings.msal_client_id,
            "cosmosEndpoint": app_settings.cosmos_endpoint,
            "cosmosDatabase": app_settings.cosmos_database,
        }

    # Mask sensitive fields
    if doc.get("azureClientSecret"):
        doc["azureClientSecret"] = _SENSITIVE_MASK

    return doc


@router.put("/app-config")
async def update_app_config(body: dict, user: UserInfo = Depends(require_admin)):
    """Update application environment configuration."""
    from app.config import settings as app_settings

    updates = {k: v for k, v in body.items() if k in _APP_CONFIG_ALLOWED_KEYS}

    # Don't overwrite real secret with the mask placeholder
    if updates.get("azureClientSecret") == _SENSITIVE_MASK:
        del updates["azureClientSecret"]

    # Check if storage/cosmos fields changed (requires restart)
    requires_restart = False
    existing = await _get_setting("app_config")
    if existing:
        for key in ("storageMode", "cosmosEndpoint", "cosmosDatabase"):
            if key in updates and updates[key] != existing.get(key):
                requires_restart = True
    else:
        # No existing doc — seed skeleton so _update_setting can upsert
        container = get_settings_container()
        await container.upsert_item(body={
            "id": "app_config",
            "settingType": "app_config",
            "storageMode": app_settings.storage_mode,
        })
        if updates.get("storageMode") or updates.get("cosmosEndpoint") or updates.get("cosmosDatabase"):
            requires_restart = True

    result = await _update_setting("app_config", updates, user)

    # Sync to in-memory settings singleton (except cosmos connection params)
    for cosmos_key, settings_key in _FIELD_MAP.items():
        value = updates.get(cosmos_key)
        if value:
            object.__setattr__(app_settings, settings_key, value)

    # Recompute msal_authority if tenant or environment changed
    if "azureTenantId" in updates or "azureEnvironment" in updates:
        object.__setattr__(
            app_settings,
            "msal_authority",
            f"{app_settings.authority_host}/{app_settings.azure_tenant_id}",
        )

    # Mask sensitive fields in response
    if result.get("azureClientSecret"):
        result["azureClientSecret"] = _SENSITIVE_MASK

    result["requiresRestart"] = requires_restart
    return result
