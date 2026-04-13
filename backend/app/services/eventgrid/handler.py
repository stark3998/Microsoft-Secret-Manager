import logging
from datetime import datetime, timezone

from app.db.cosmos_client import get_items_container, get_settings_container
from app.db.queries import query_items, upsert_item
from app.services.expiration import compute_expiration_status
from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)

# Event types we care about
KV_EVENTS = {
    "Microsoft.KeyVault.SecretNewVersionCreated",
    "Microsoft.KeyVault.SecretNearExpiry",
    "Microsoft.KeyVault.SecretExpired",
    "Microsoft.KeyVault.KeyNewVersionCreated",
    "Microsoft.KeyVault.KeyNearExpiry",
    "Microsoft.KeyVault.KeyExpired",
    "Microsoft.KeyVault.CertificateNewVersionCreated",
    "Microsoft.KeyVault.CertificateNearExpiry",
    "Microsoft.KeyVault.CertificateExpired",
}


async def process_events(event: dict) -> None:
    """Process a single Event Grid event from Key Vault."""
    event_type = event.get("eventType", "")
    if event_type not in KV_EVENTS:
        logger.debug(f"Ignoring event type: {event_type}")
        return

    data = event.get("data", {})
    vault_name = data.get("VaultName", "")
    object_type = data.get("ObjectType", "").lower()  # Secret, Key, Certificate
    object_name = data.get("ObjectName", "")

    if not vault_name or not object_name:
        logger.warning(f"Event missing required fields: {event}")
        return

    logger.info(f"Processing event: {event_type} for {vault_name}/{object_name}")

    try:
        credential = get_azure_credential()

        # Fetch the updated item from Key Vault
        vault_uri = f"https://{vault_name}.vault.azure.net"
        item_doc = await _fetch_item(credential, vault_uri, object_type, object_name)

        if item_doc:
            # Load threshold settings
            settings_container = get_settings_container()
            threshold_settings = await query_items(
                settings_container, "SELECT * FROM c WHERE c.id = 'thresholds'"
            )
            tiers = threshold_settings[0].get("tiers") if threshold_settings else None

            # Compute expiration
            expires_on = None
            if item_doc.get("expiresOn"):
                expires_on = datetime.fromisoformat(item_doc["expiresOn"])
            status, days = compute_expiration_status(expires_on, tiers)
            item_doc["expirationStatus"] = status
            item_doc["daysUntilExpiration"] = days
            item_doc["lastScannedAt"] = datetime.now(timezone.utc).isoformat()

            # Upsert to Cosmos
            items_container = get_items_container()
            await upsert_item(items_container, item_doc)
            logger.info(f"Updated {object_type} {object_name} in vault {vault_name}: status={status}")

    except Exception as e:
        logger.exception(f"Failed to process event for {vault_name}/{object_name}: {e}")


async def _fetch_item(credential, vault_uri: str, object_type: str, object_name: str) -> dict | None:
    """Fetch a single item from Key Vault and return as a document."""
    try:
        if object_type == "secret":
            from azure.keyvault.secrets.aio import SecretClient
            client = SecretClient(vault_url=vault_uri, credential=credential)
            try:
                props = (await client.get_secret(object_name)).properties
                return {
                    "id": f"kv-secret-eventgrid-{object_name}",
                    "partitionKey": "eventgrid-pending",
                    "itemType": "secret",
                    "source": "keyvault",
                    "vaultName": vault_uri.replace("https://", "").replace(".vault.azure.net", ""),
                    "vaultUri": vault_uri,
                    "itemName": object_name,
                    "enabled": props.enabled or False,
                    "expiresOn": props.expires_on.isoformat() if props.expires_on else None,
                    "createdOn": props.created_on.isoformat() if props.created_on else None,
                    "updatedOn": props.updated_on.isoformat() if props.updated_on else None,
                }
            finally:
                await client.close()

        elif object_type == "key":
            from azure.keyvault.keys.aio import KeyClient
            client = KeyClient(vault_url=vault_uri, credential=credential)
            try:
                key = await client.get_key(object_name)
                props = key.properties
                return {
                    "id": f"kv-key-eventgrid-{object_name}",
                    "partitionKey": "eventgrid-pending",
                    "itemType": "key",
                    "source": "keyvault",
                    "vaultName": vault_uri.replace("https://", "").replace(".vault.azure.net", ""),
                    "vaultUri": vault_uri,
                    "itemName": object_name,
                    "enabled": props.enabled or False,
                    "expiresOn": props.expires_on.isoformat() if props.expires_on else None,
                    "createdOn": props.created_on.isoformat() if props.created_on else None,
                    "updatedOn": props.updated_on.isoformat() if props.updated_on else None,
                }
            finally:
                await client.close()

        elif object_type == "certificate":
            from azure.keyvault.certificates.aio import CertificateClient
            client = CertificateClient(vault_url=vault_uri, credential=credential)
            try:
                cert = await client.get_certificate(object_name)
                props = cert.properties
                return {
                    "id": f"kv-cert-eventgrid-{object_name}",
                    "partitionKey": "eventgrid-pending",
                    "itemType": "certificate",
                    "source": "keyvault",
                    "vaultName": vault_uri.replace("https://", "").replace(".vault.azure.net", ""),
                    "vaultUri": vault_uri,
                    "itemName": object_name,
                    "enabled": props.enabled or False,
                    "expiresOn": props.expires_on.isoformat() if props.expires_on else None,
                    "createdOn": props.created_on.isoformat() if props.created_on else None,
                    "updatedOn": props.updated_on.isoformat() if props.updated_on else None,
                }
            finally:
                await client.close()

    except Exception as e:
        logger.exception(f"Failed to fetch {object_type} {object_name}: {e}")
        return None
