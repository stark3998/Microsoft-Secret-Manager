import logging
import uuid
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.keyvault.secrets.aio import SecretClient
from azure.keyvault.keys.aio import KeyClient
from azure.keyvault.certificates.aio import CertificateClient

from app.services.expiration import compute_expiration_status

logger = logging.getLogger(__name__)


class ScanResult:
    """Holds items found plus any warnings to surface in the scan log."""

    def __init__(self):
        self.items: list[dict] = []
        self.warnings: list[str] = []
        self.vaults_found: int = 0
        self.vaults_accessible: int = 0


async def scan_subscription(
    credential: DefaultAzureCredential,
    subscription_id: str,
    subscription_name: str,
    scan_run_id: str,
    tiers: list[dict] | None = None,
) -> ScanResult:
    """Scan all Key Vaults in a subscription for secrets, keys, and certificates."""
    result = ScanResult()

    # List all Key Vaults in the subscription
    kv_mgmt = KeyVaultManagementClient(credential, subscription_id)
    vaults = []
    for vault in kv_mgmt.vaults.list_by_subscription():
        vaults.append(vault)

    result.vaults_found = len(vaults)
    logger.info(f"Found {len(vaults)} vaults in subscription {subscription_name}")

    vaults_denied = 0

    for vault in vaults:
        vault_uri = vault.properties.vault_uri
        vault_name = vault.name
        resource_group = vault.id.split("/")[4] if vault.id else ""

        try:
            # Scan secrets
            secret_items = await _scan_secrets(
                credential, vault_uri, vault_name, subscription_id,
                subscription_name, resource_group, scan_run_id, tiers,
            )
            result.items.extend(secret_items)

            # Scan keys
            key_items = await _scan_keys(
                credential, vault_uri, vault_name, subscription_id,
                subscription_name, resource_group, scan_run_id, tiers,
            )
            result.items.extend(key_items)

            # Scan certificates
            cert_items = await _scan_certificates(
                credential, vault_uri, vault_name, subscription_id,
                subscription_name, resource_group, scan_run_id, tiers,
            )
            result.items.extend(cert_items)

            logger.info(
                f"Vault {vault_name}: {len(secret_items)} secrets, "
                f"{len(key_items)} keys, {len(cert_items)} certs"
            )
            result.vaults_accessible += 1

        except Exception as e:
            error_str = str(e)
            if "403" in error_str or "Forbidden" in error_str or "AccessDenied" in error_str:
                msg = (
                    f"Access denied to vault \"{vault_name}\". "
                    f"Assign 'Key Vault Reader' + 'Key Vault Secrets User' + "
                    f"'Key Vault Crypto User' + 'Key Vault Certificate User' "
                    f"RBAC roles to the scanning identity on this vault."
                )
                logger.warning(msg)
                result.warnings.append(msg)
                vaults_denied += 1
            else:
                msg = f"Error scanning vault {vault_name}: {e}"
                logger.error(msg)
                result.warnings.append(msg)

    if vaults_denied > 0:
        logger.warning(
            f"Subscription \"{subscription_name}\": {result.vaults_accessible}/{len(vaults)} vaults "
            f"accessible, {vaults_denied} denied (missing data-plane RBAC). "
            f"Collected {len(result.items)} items total."
        )

    return result


async def _scan_secrets(
    credential, vault_uri, vault_name, sub_id, sub_name, rg, scan_run_id, tiers,
) -> list[dict]:
    items = []
    client = SecretClient(vault_url=vault_uri, credential=credential)
    try:
        async for secret in client.list_properties_of_secrets():
            expires_on = secret.expires_on
            status, days = compute_expiration_status(expires_on, tiers)

            item_id = f"kv-secret-{sub_id}-{vault_name}-{secret.name}"
            items.append({
                "id": item_id,
                "partitionKey": sub_id,
                "itemType": "secret",
                "source": "keyvault",
                "subscriptionId": sub_id,
                "subscriptionName": sub_name,
                "resourceGroup": rg,
                "vaultName": vault_name,
                "vaultUri": vault_uri,
                "itemName": secret.name,
                "itemVersion": secret.version or "",
                "enabled": secret.enabled or False,
                "expiresOn": expires_on.isoformat() if expires_on else None,
                "createdOn": secret.created_on.isoformat() if secret.created_on else None,
                "updatedOn": secret.updated_on.isoformat() if secret.updated_on else None,
                "notBeforeDate": secret.not_before.isoformat() if secret.not_before else None,
                "tags": dict(secret.tags) if secret.tags else {},
                "expirationStatus": status,
                "daysUntilExpiration": days,
                "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                "scanRunId": scan_run_id,
            })
    except Exception as e:
        logger.error(f"Error scanning secrets in {vault_name}: {e}")
        raise
    finally:
        await client.close()
    return items


async def _scan_keys(
    credential, vault_uri, vault_name, sub_id, sub_name, rg, scan_run_id, tiers,
) -> list[dict]:
    items = []
    client = KeyClient(vault_url=vault_uri, credential=credential)
    try:
        async for key in client.list_properties_of_keys():
            expires_on = key.expires_on
            status, days = compute_expiration_status(expires_on, tiers)

            item_id = f"kv-key-{sub_id}-{vault_name}-{key.name}"
            items.append({
                "id": item_id,
                "partitionKey": sub_id,
                "itemType": "key",
                "source": "keyvault",
                "subscriptionId": sub_id,
                "subscriptionName": sub_name,
                "resourceGroup": rg,
                "vaultName": vault_name,
                "vaultUri": vault_uri,
                "itemName": key.name,
                "itemVersion": key.version or "",
                "enabled": key.enabled or False,
                "expiresOn": expires_on.isoformat() if expires_on else None,
                "createdOn": key.created_on.isoformat() if key.created_on else None,
                "updatedOn": key.updated_on.isoformat() if key.updated_on else None,
                "notBeforeDate": key.not_before.isoformat() if key.not_before else None,
                "tags": dict(key.tags) if key.tags else {},
                "keyProperties": {
                    "keyType": key.key_type.value if key.key_type else None,
                    "keySize": key.key_size,
                    "keyOps": [op.value for op in key.key_operations] if key.key_operations else [],
                },
                "expirationStatus": status,
                "daysUntilExpiration": days,
                "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                "scanRunId": scan_run_id,
            })
    except Exception as e:
        logger.error(f"Error scanning keys in {vault_name}: {e}")
        raise
    finally:
        await client.close()
    return items


async def _scan_certificates(
    credential, vault_uri, vault_name, sub_id, sub_name, rg, scan_run_id, tiers,
) -> list[dict]:
    items = []
    client = CertificateClient(vault_url=vault_uri, credential=credential)
    try:
        async for cert in client.list_properties_of_certificates():
            expires_on = cert.expires_on
            status, days = compute_expiration_status(expires_on, tiers)

            item_id = f"kv-cert-{sub_id}-{vault_name}-{cert.name}"
            items.append({
                "id": item_id,
                "partitionKey": sub_id,
                "itemType": "certificate",
                "source": "keyvault",
                "subscriptionId": sub_id,
                "subscriptionName": sub_name,
                "resourceGroup": rg,
                "vaultName": vault_name,
                "vaultUri": vault_uri,
                "itemName": cert.name,
                "itemVersion": cert.version or "",
                "enabled": cert.enabled or False,
                "expiresOn": expires_on.isoformat() if expires_on else None,
                "createdOn": cert.created_on.isoformat() if cert.created_on else None,
                "updatedOn": cert.updated_on.isoformat() if cert.updated_on else None,
                "tags": dict(cert.tags) if cert.tags else {},
                "certProperties": {
                    "subject": cert.subject,
                    "thumbprint": cert.x509_thumbprint.hex() if cert.x509_thumbprint else None,
                },
                "expirationStatus": status,
                "daysUntilExpiration": days,
                "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                "scanRunId": scan_run_id,
            })
    except Exception as e:
        logger.error(f"Error scanning certificates in {vault_name}: {e}")
        raise
    finally:
        await client.close()
    return items
