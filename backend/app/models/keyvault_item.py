from datetime import datetime
from typing import Any

from pydantic import BaseModel


class KeyProperties(BaseModel):
    key_type: str | None = None
    key_size: int | None = None
    key_ops: list[str] = []


class CertProperties(BaseModel):
    issuer: str | None = None
    subject: str | None = None
    thumbprint: str | None = None
    serial_number: str | None = None


class KeyVaultItem(BaseModel):
    id: str
    partition_key: str  # subscriptionId
    item_type: str  # secret | key | certificate
    source: str = "keyvault"
    subscription_id: str
    subscription_name: str = ""
    resource_group: str = ""
    vault_name: str
    vault_uri: str = ""
    item_name: str
    item_version: str = ""
    enabled: bool = True
    expires_on: datetime | None = None
    created_on: datetime | None = None
    updated_on: datetime | None = None
    not_before_date: datetime | None = None
    tags: dict[str, str] = {}
    key_properties: KeyProperties | None = None
    cert_properties: CertProperties | None = None
    expiration_status: str = "healthy"
    days_until_expiration: int | None = None
    last_scanned_at: datetime | None = None
    scan_run_id: str = ""

    def to_cosmos_doc(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format (camelCase keys)."""
        doc = {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "source": self.source,
            "subscriptionId": self.subscription_id,
            "subscriptionName": self.subscription_name,
            "resourceGroup": self.resource_group,
            "vaultName": self.vault_name,
            "vaultUri": self.vault_uri,
            "itemName": self.item_name,
            "itemVersion": self.item_version,
            "enabled": self.enabled,
            "expiresOn": self.expires_on.isoformat() if self.expires_on else None,
            "createdOn": self.created_on.isoformat() if self.created_on else None,
            "updatedOn": self.updated_on.isoformat() if self.updated_on else None,
            "notBeforeDate": self.not_before_date.isoformat() if self.not_before_date else None,
            "tags": self.tags,
            "expirationStatus": self.expiration_status,
            "daysUntilExpiration": self.days_until_expiration,
            "lastScannedAt": self.last_scanned_at.isoformat() if self.last_scanned_at else None,
            "scanRunId": self.scan_run_id,
        }
        if self.key_properties:
            doc["keyProperties"] = {
                "keyType": self.key_properties.key_type,
                "keySize": self.key_properties.key_size,
                "keyOps": self.key_properties.key_ops,
            }
        if self.cert_properties:
            doc["certProperties"] = {
                "issuer": self.cert_properties.issuer,
                "subject": self.cert_properties.subject,
                "thumbprint": self.cert_properties.thumbprint,
                "serialNumber": self.cert_properties.serial_number,
            }
        return doc
