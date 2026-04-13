import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/setup", tags=["setup"])


# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------

def _is_setup_complete() -> bool:
    from app.db.cosmos_client import items_container, settings_container
    storage_ready = items_container is not None and settings_container is not None
    if settings.auth_disabled:
        return storage_ready
    return (
        storage_ready
        and bool(settings.azure_tenant_id)
        and bool(settings.azure_client_id)
    )


def _require_setup_mode():
    if _is_setup_complete():
        raise HTTPException(
            status_code=403,
            detail="Application is already configured. Use the Settings page instead.",
        )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CosmosValidateRequest(BaseModel):
    endpoint: str
    key: str = ""
    database: str = "secret-manager"
    use_managed_identity: bool = False


class InitializeRequest(BaseModel):
    # Storage
    storage_mode: str = "cosmos"  # "cosmos" | "local"
    # Cosmos (ignored when storage_mode=local)
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database: str = "secret-manager"
    cosmos_use_managed_identity: bool = False
    # Azure / Entra ID
    azure_tenant_id: str
    azure_client_id: str
    azure_client_secret: str = ""
    azure_environment: str = "AzureCloud"
    managed_identity_client_id: str = ""
    # MSAL (defaults to azure_client_id)
    msal_client_id: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def get_setup_status():
    """Check application configuration status. No auth required."""
    from app.db.cosmos_client import _client, items_container, settings_container

    is_local = settings.storage_mode == "local"
    storage_ready = items_container is not None and settings_container is not None

    has_app_config = False
    if storage_ready and settings_container is not None:
        try:
            async for _ in settings_container.query_items(
                "SELECT c.id FROM c WHERE c.id = 'app_config'",
                partition_key="app_config",
            ):
                has_app_config = True
                break
        except Exception:
            pass

    azure_ok = bool(settings.azure_tenant_id and settings.azure_client_id)
    msal_ok = bool(settings.msal_client_id or settings.azure_client_id)

    is_configured = (storage_ready and azure_ok) or (storage_ready and settings.auth_disabled)

    return {
        "isConfigured": is_configured,
        "storageMode": settings.storage_mode,
        "storageReady": storage_ready,
        "cosmosConnected": _client is not None if not is_local else False,
        "cosmosEndpoint": _mask(settings.cosmos_endpoint) if not is_local else "",
        "localMode": is_local,
        "hasAppConfig": has_app_config,
        "azureConfigured": azure_ok,
        "msalConfigured": msal_ok,
        "authDisabled": settings.auth_disabled,
    }


@router.get("/frontend-config")
async def get_frontend_config():
    """Return MSAL configuration for the frontend. No auth required."""
    from app.db.cosmos_client import settings_container

    tenant_id = settings.azure_tenant_id
    client_id = settings.msal_client_id or settings.azure_client_id
    environment = settings.azure_environment

    if settings_container is not None:
        try:
            async for doc in settings_container.query_items(
                "SELECT * FROM c WHERE c.id = 'app_config'",
                partition_key="app_config",
            ):
                tenant_id = doc.get("azureTenantId", tenant_id)
                client_id = doc.get("msalClientId") or doc.get("azureClientId", client_id)
                environment = doc.get("azureEnvironment", environment)
                break
        except Exception:
            pass

    if not client_id or not tenant_id:
        return {"configured": False}

    hosts = {
        "AzureCloud": "https://login.microsoftonline.com",
        "AzureChinaCloud": "https://login.chinacloudapi.cn",
        "AzureUSGovernment": "https://login.microsoftonline.us",
    }
    authority = f"{hosts.get(environment, hosts['AzureCloud'])}/{tenant_id}"

    return {
        "configured": True,
        "clientId": client_id,
        "tenantId": tenant_id,
        "authority": authority,
    }


@router.post("/validate-cosmos")
async def validate_cosmos(body: CosmosValidateRequest):
    """Test a Cosmos DB connection without persisting. Only available during setup."""
    _require_setup_mode()

    from azure.cosmos.aio import CosmosClient

    client = None
    try:
        if body.use_managed_identity:
            from app.utils.azure_credential import get_azure_credential
            client = CosmosClient(body.endpoint, credential=get_azure_credential())
        else:
            if not body.key:
                raise HTTPException(400, "Cosmos key is required when not using managed identity")
            client = CosmosClient(body.endpoint, credential=body.key)

        databases: list[str] = []
        async for db in client.list_databases():
            databases.append(db["id"])

        return {"success": True, "message": "Connection successful", "databases": databases}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "message": f"Connection failed: {e}"}
    finally:
        if client:
            await client.close()


@router.post("/initialize")
async def initialize_app(body: InitializeRequest):
    """Initialise storage, seed defaults, and store app config."""
    _require_setup_mode()

    mode = body.storage_mode

    # 1) Update in-memory settings
    _apply_settings(storage_mode=mode)

    if mode == "cosmos":
        _apply_settings(
            cosmos_endpoint=body.cosmos_endpoint,
            cosmos_key=body.cosmos_key,
            cosmos_database=body.cosmos_database,
        )

    _apply_settings(
        azure_tenant_id=body.azure_tenant_id,
        azure_client_id=body.azure_client_id,
        azure_client_secret=body.azure_client_secret,
        azure_environment=body.azure_environment,
        managed_identity_client_id=body.managed_identity_client_id,
        msal_client_id=body.msal_client_id or body.azure_client_id,
    )
    object.__setattr__(
        settings,
        "msal_authority",
        f"{settings.authority_host}/{body.azure_tenant_id}",
    )

    # 2) Initialise storage (Cosmos DB *or* local JSON files)
    from app.db.cosmos_client import init_cosmos, get_settings_container
    try:
        await init_cosmos()
    except Exception as e:
        logger.exception(f"Storage init failed during setup: {e}")
        raise HTTPException(500, f"Failed to initialise storage: {e}")

    # 3) Persist app_config in the settings store
    try:
        container = get_settings_container()
        app_config = {
            "id": "app_config",
            "settingType": "app_config",
            "storageMode": mode,
            "azureTenantId": body.azure_tenant_id,
            "azureClientId": body.azure_client_id,
            "azureClientSecret": body.azure_client_secret,
            "azureEnvironment": body.azure_environment,
            "managedIdentityClientId": body.managed_identity_client_id,
            "msalClientId": body.msal_client_id or body.azure_client_id,
            "setupCompletedAt": datetime.now(timezone.utc).isoformat(),
        }
        if mode == "cosmos":
            app_config["cosmosEndpoint"] = body.cosmos_endpoint
            app_config["cosmosDatabase"] = body.cosmos_database
        await container.upsert_item(body=app_config)
    except Exception as e:
        raise HTTPException(500, f"Failed to save app config: {e}")

    # 4) Start scheduler
    try:
        from app.services.scheduler import start_scheduler
        await start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler start failed (non-fatal): {e}")

    return {"success": True, "message": "Application initialised successfully", "storageMode": mode}


@router.post("/generate-env")
async def generate_env(body: InitializeRequest):
    """Generate .env file content for the chosen storage mode."""
    msal_id = body.msal_client_id or body.azure_client_id
    hosts = {
        "AzureCloud": "https://login.microsoftonline.com",
        "AzureChinaCloud": "https://login.chinacloudapi.cn",
        "AzureUSGovernment": "https://login.microsoftonline.us",
    }
    authority = f"{hosts.get(body.azure_environment, hosts['AzureCloud'])}/{body.azure_tenant_id}"

    lines = [
        "# =============================================================================",
        "# Storage Mode",
        "# =============================================================================",
        f"STORAGE_MODE={body.storage_mode}",
    ]

    if body.storage_mode == "local":
        lines.append("LOCAL_DATA_DIR=./data")
    else:
        lines += [
            "",
            "# =============================================================================",
            "# Cosmos DB",
            "# =============================================================================",
            f"COSMOS_ENDPOINT={body.cosmos_endpoint}",
            f"COSMOS_KEY={body.cosmos_key}",
            f"COSMOS_DATABASE={body.cosmos_database}",
        ]

    lines += [
        "",
        "# =============================================================================",
        "# Azure / Entra ID",
        "# =============================================================================",
        f"AZURE_TENANT_ID={body.azure_tenant_id}",
        f"AZURE_CLIENT_ID={body.azure_client_id}",
        f"AZURE_CLIENT_SECRET={body.azure_client_secret}",
        f"AZURE_ENVIRONMENT={body.azure_environment}",
    ]
    if body.managed_identity_client_id:
        lines.append(f"MANAGED_IDENTITY_CLIENT_ID={body.managed_identity_client_id}")

    lines += [
        "",
        "# =============================================================================",
        "# MSAL Token Validation",
        "# =============================================================================",
        f"MSAL_CLIENT_ID={msal_id}",
        f"MSAL_AUTHORITY={authority}",
        "",
        "# =============================================================================",
        "# Frontend (prefix with VITE_ for Vite exposure)",
        "# =============================================================================",
        f"VITE_AZURE_CLIENT_ID={msal_id}",
        f"VITE_AZURE_TENANT_ID={body.azure_tenant_id}",
        "VITE_API_BASE_URL=http://localhost:8000",
        "",
        "# =============================================================================",
        "# Scheduler",
        "# =============================================================================",
        "SCAN_CRON_EXPRESSION=0 6 * * *",
        "PURGE_CRON_EXPRESSION=0 0 1 * *",
        "",
        "# Remaining settings (notifications, ACME, SAML) can be configured",
        "# via the Settings page after first login.",
    ]

    return {"content": "\n".join(lines)}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _apply_settings(**kwargs: str):
    for key, value in kwargs.items():
        if value and hasattr(settings, key):
            object.__setattr__(settings, key, value)


def _mask(value: str) -> str:
    if not value:
        return ""
    return value[:30] + "..." if len(value) > 30 else value
