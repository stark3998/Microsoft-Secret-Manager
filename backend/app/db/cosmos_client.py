import logging

from azure.cosmos.aio import CosmosClient, DatabaseProxy, ContainerProxy
from azure.cosmos import PartitionKey
from azure.cosmos.exceptions import CosmosResourceExistsError

from app.config import settings

logger = logging.getLogger(__name__)

_client: CosmosClient | None = None
_database: DatabaseProxy | None = None

# Container references
items_container: ContainerProxy | None = None
settings_container: ContainerProxy | None = None
scan_history_container: ContainerProxy | None = None

# Container definitions
CONTAINERS = {
    "items": {
        "partition_key": "/partitionKey",
        "default_ttl": None,
    },
    "settings": {
        "partition_key": "/settingType",
        "default_ttl": None,
    },
    "scan_history": {
        "partition_key": "/status",
        "default_ttl": 7776000,  # 90 days in seconds
    },
}


async def init_cosmos() -> None:
    """Initialize Cosmos DB client, database, and containers."""
    global _client, _database, items_container, settings_container, scan_history_container

    if not settings.cosmos_endpoint:
        logger.warning("COSMOS_ENDPOINT not set — skipping Cosmos DB initialization")
        return

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

    # Create containers if not exist
    for name, config in CONTAINERS.items():
        try:
            kwargs = {
                "id": name,
                "partition_key": PartitionKey(path=config["partition_key"]),
            }
            if config["default_ttl"] is not None:
                kwargs["default_ttl"] = config["default_ttl"]
            await _database.create_container(**kwargs)
            logger.info(f"Created container '{name}'")
        except CosmosResourceExistsError:
            logger.info(f"Using existing container '{name}'")

    items_container = _database.get_container_client("items")
    settings_container = _database.get_container_client("settings")
    scan_history_container = _database.get_container_client("scan_history")

    # Seed default settings
    await _seed_default_settings()


async def _seed_default_settings() -> None:
    """Create default settings documents if they don't exist."""
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
    ]

    for doc in defaults:
        try:
            await settings_container.create_item(body=doc)
            logger.info(f"Seeded default setting: {doc['id']}")
        except CosmosResourceExistsError:
            pass


async def close_cosmos() -> None:
    """Close the Cosmos DB client."""
    global _client
    if _client:
        await _client.close()
        _client = None


def get_items_container() -> ContainerProxy:
    if items_container is None:
        raise RuntimeError("Cosmos DB not initialized")
    return items_container


def get_settings_container() -> ContainerProxy:
    if settings_container is None:
        raise RuntimeError("Cosmos DB not initialized")
    return settings_container


def get_scan_history_container() -> ContainerProxy:
    if scan_history_container is None:
        raise RuntimeError("Cosmos DB not initialized")
    return scan_history_container
