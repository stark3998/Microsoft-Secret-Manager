"""Key Vault tag write-back service.

Writes expiration metadata as tags on Key Vault items so that teams
can see status directly in the Azure portal without needing this app.
"""

import logging
from datetime import datetime, timezone

from azure.keyvault.secrets.aio import SecretClient
from azure.keyvault.keys.aio import KeyClient
from azure.keyvault.certificates.aio import CertificateClient

from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)

TAG_PREFIX = "sm-"


async def write_tags_for_items(items: list[dict]) -> int:
    """Write expiration status tags to Key Vault items.

    Tags written:
        sm-status: expired|critical|warning|healthy
        sm-days: days until expiration
        sm-scanned: ISO timestamp of last scan

    Returns count of successfully tagged items.
    """
    credential = get_azure_credential()
    tagged = 0

    for item in items:
        if item.get("source") != "keyvault":
            continue

        vault_uri = item.get("vaultUri")
        item_name = item.get("itemName")
        item_type = item.get("itemType")
        if not vault_uri or not item_name or not item_type:
            continue

        tags = {
            f"{TAG_PREFIX}status": item.get("expirationStatus", "unknown"),
            f"{TAG_PREFIX}days": str(item.get("daysUntilExpiration", "")),
            f"{TAG_PREFIX}scanned": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }

        try:
            match item_type:
                case "secret":
                    await _tag_secret(credential, vault_uri, item_name, tags)
                case "key":
                    await _tag_key(credential, vault_uri, item_name, tags)
                case "certificate":
                    await _tag_certificate(credential, vault_uri, item_name, tags)
            tagged += 1
        except Exception as e:
            logger.warning(f"Tag write-back failed for {item_type} '{item_name}' in {vault_uri}: {e}")

    logger.info(f"Tag write-back complete: {tagged}/{len(items)} items tagged")
    return tagged


async def _tag_secret(credential, vault_uri: str, name: str, tags: dict) -> None:
    client = SecretClient(vault_url=vault_uri, credential=credential)
    try:
        props = await client.get_secret(name)
        merged = {**(props.properties.tags or {}), **tags}
        await client.update_secret_properties(name, tags=merged)
    finally:
        await client.close()


async def _tag_key(credential, vault_uri: str, name: str, tags: dict) -> None:
    client = KeyClient(vault_url=vault_uri, credential=credential)
    try:
        props = await client.get_key(name)
        merged = {**(props.properties.tags or {}), **tags}
        await client.update_key_properties(name, tags=merged)
    finally:
        await client.close()


async def _tag_certificate(credential, vault_uri: str, name: str, tags: dict) -> None:
    client = CertificateClient(vault_url=vault_uri, credential=credential)
    try:
        props = await client.get_certificate(name)
        merged = {**(props.properties.tags or {}), **tags}
        await client.update_certificate_properties(name, tags=merged)
    finally:
        await client.close()
