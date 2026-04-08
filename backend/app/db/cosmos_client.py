import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

_client: Any = None  # CosmosClient | None (only set in cosmos mode)
_database: Any = None

# Container references — either Cosmos ContainerProxy or LocalContainerProxy
items_container: Any = None
settings_container: Any = None
scan_history_container: Any = None


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

async def init_cosmos() -> None:
    """Initialise the storage layer.

    * ``storage_mode=cosmos`` → Azure Cosmos DB (original behaviour)
    * ``storage_mode=local``  → file-backed JSON store, no cloud dependency
    """
    if settings.storage_mode == "local":
        await _init_local()
    else:
        await _init_cosmos_db()


async def _init_local() -> None:
    """Initialise local JSON-file containers."""
    global items_container, settings_container, scan_history_container

    from app.db.local_store import init_local_containers

    logger.info(f"Initialising local storage in '{settings.local_data_dir}'")
    containers = init_local_containers(settings.local_data_dir)

    items_container = containers["items"]
    settings_container = containers["settings"]
    scan_history_container = containers["scan_history"]

    await _seed_default_settings()
    await _load_app_config()
    logger.info("Local storage ready")


async def _init_cosmos_db() -> None:
    """Initialise Azure Cosmos DB client, database, and containers."""
    global _client, _database, items_container, settings_container, scan_history_container

    if not settings.cosmos_endpoint:
        logger.warning("COSMOS_ENDPOINT not set — skipping Cosmos DB initialisation")
        return

    from azure.cosmos.aio import CosmosClient
    from azure.cosmos import PartitionKey
    from azure.cosmos.exceptions import CosmosResourceExistsError

    logger.info(f"Connecting to Cosmos DB at {settings.cosmos_endpoint}")

    if settings.cosmos_key:
        _client = CosmosClient(settings.cosmos_endpoint, credential=settings.cosmos_key)
    else:
        from app.utils.azure_credential import get_azure_credential
        _client = CosmosClient(settings.cosmos_endpoint, credential=get_azure_credential())

    # Create database if not exists
    try:
        _database = await _client.create_database(settings.cosmos_database)
        logger.info(f"Created database '{settings.cosmos_database}'")
    except CosmosResourceExistsError:
        _database = _client.get_database_client(settings.cosmos_database)
        logger.info(f"Using existing database '{settings.cosmos_database}'")

    # Container definitions
    container_defs = {
        "items": {"partition_key": "/partitionKey", "default_ttl": None},
        "settings": {"partition_key": "/settingType", "default_ttl": None},
        "scan_history": {"partition_key": "/status", "default_ttl": 7776000},
    }

    for name, cfg in container_defs.items():
        try:
            kwargs = {
                "id": name,
                "partition_key": PartitionKey(path=cfg["partition_key"]),
            }
            if cfg["default_ttl"] is not None:
                kwargs["default_ttl"] = cfg["default_ttl"]
            await _database.create_container(**kwargs)
            logger.info(f"Created container '{name}'")
        except CosmosResourceExistsError:
            logger.info(f"Using existing container '{name}'")

    items_container = _database.get_container_client("items")
    settings_container = _database.get_container_client("settings")
    scan_history_container = _database.get_container_client("scan_history")

    await _seed_default_settings()
    await _load_app_config()


# ---------------------------------------------------------------------------
# App config loading (DB-mode installs persist config in Cosmos)
# ---------------------------------------------------------------------------

async def _load_app_config() -> None:
    """Load application configuration from the settings container and update
    the in-memory ``settings`` singleton."""
    if settings_container is None:
        return
    try:
        async for doc in settings_container.query_items(
            "SELECT * FROM c WHERE c.id = 'app_config'",
            partition_key="app_config",
        ):
            field_map = {
                "azureTenantId": "azure_tenant_id",
                "azureClientId": "azure_client_id",
                "azureClientSecret": "azure_client_secret",
                "azureEnvironment": "azure_environment",
                "managedIdentityClientId": "managed_identity_client_id",
                "msalClientId": "msal_client_id",
            }
            for cosmos_key, settings_key in field_map.items():
                value = doc.get(cosmos_key)
                if value:
                    object.__setattr__(settings, settings_key, value)

            if settings.azure_tenant_id and not settings.msal_authority:
                object.__setattr__(
                    settings,
                    "msal_authority",
                    f"{settings.authority_host}/{settings.azure_tenant_id}",
                )
            logger.info("Loaded application configuration from settings store")
            return
    except Exception as e:
        logger.warning(f"Failed to load app config: {e}")


# ---------------------------------------------------------------------------
# Default settings seeding
# ---------------------------------------------------------------------------

async def _seed_default_settings() -> None:
    """Create default settings documents if they don't exist."""
    if settings_container is None:
        return

    # Collect exception types to catch (Cosmos SDK may not be installed in local mode)
    err_types: tuple = ()
    try:
        from azure.cosmos.exceptions import CosmosResourceExistsError as _CosmosErr
        err_types += (_CosmosErr,)
    except ImportError:
        pass
    try:
        from app.db.local_store import CosmosResourceExistsError as _LocalErr
        err_types += (_LocalErr,)
    except ImportError:
        pass
    if not err_types:
        err_types = (Exception,)

    defaults = [
        {
            "id": "thresholds",
            "settingType": "thresholds",
            "tiers": [
                {"name": "critical", "daysBeforeExpiry": 7, "color": "#d32f2f"},
                {"name": "warning", "daysBeforeExpiry": 30, "color": "#ed6c02"},
                {"name": "notice", "daysBeforeExpiry": 90, "color": "#0288d1"},
            ],
            "updatedBy": "system",
            "updatedAt": None,
        },
        {
            "id": "notifications",
            "settingType": "notifications",
            "emailEnabled": False,
            "emailRecipients": [],
            "emailFrom": settings.notification_email_from,
            "teamsEnabled": False,
            "teamsWebhookUrl": settings.teams_webhook_url,
            "slackEnabled": False,
            "slackWebhookUrl": settings.slack_webhook_url,
            "webhookEnabled": False,
            "genericWebhookUrl": settings.generic_webhook_url,
            "webhookHeaders": {},
            "notifyOnStatusChange": True,
            "dailyDigestEnabled": False,
            "dailyDigestTime": "08:00",
            "updatedBy": "system",
            "updatedAt": None,
        },
        {
            "id": "schedule",
            "settingType": "schedule",
            "cronExpression": settings.scan_cron_expression,
            "enabled": True,
            "subscriptionFilter": [],
            "updatedBy": "system",
            "updatedAt": None,
        },
        {
            "id": "saml_rotation",
            "settingType": "saml_rotation",
            "enabled": False,
            "triggerDays": 60,
            "activationGraceDays": 14,
            "cleanupGraceDays": 7,
            "autoActivate": False,
            "excludedServicePrincipals": [],
            "spMetadataRefreshCapable": [],
            "updatedBy": "system",
            "updatedAt": None,
        },
    ]

    for doc in defaults:
        try:
            await settings_container.create_item(body=doc)
            logger.info(f"Seeded default setting: {doc['id']}")
        except err_types:
            pass


# ---------------------------------------------------------------------------
# Shutdown
# ---------------------------------------------------------------------------

async def close_cosmos() -> None:
    """Close the Cosmos DB client (no-op in local mode)."""
    global _client
    if _client:
        await _client.close()
        _client = None


# ---------------------------------------------------------------------------
# Container accessors
# ---------------------------------------------------------------------------

def get_items_container():
    if items_container is None:
        raise RuntimeError("Storage not initialised")
    return items_container


def get_settings_container():
    if settings_container is None:
        raise RuntimeError("Storage not initialised")
    return settings_container


def get_scan_history_container():
    if scan_history_container is None:
        raise RuntimeError("Storage not initialised")
    return scan_history_container
