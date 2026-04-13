"""Audit log model for tracking administrative actions."""

from datetime import datetime, timezone
from enum import StrEnum
from pydantic import BaseModel


class AuditAction(StrEnum):
    SCAN_TRIGGERED = "scan.triggered"
    SETTINGS_UPDATED = "settings.updated"
    CERTIFICATE_ISSUED = "certificate.issued"
    CERTIFICATE_RENEWED = "certificate.renewed"
    CERTIFICATE_REVOKED = "certificate.revoked"
    SAML_ROTATION_INITIATED = "saml_rotation.initiated"
    SAML_ROTATION_ACTIVATED = "saml_rotation.activated"
    SAML_ROTATION_CANCELLED = "saml_rotation.cancelled"
    ITEM_ACKNOWLEDGED = "item.acknowledged"
    ITEM_SNOOZED = "item.snoozed"
    ITEM_UNACKNOWLEDGED = "item.unacknowledged"
    ITEM_CREATED = "item.created"
    ITEM_UPDATED = "item.updated"
    ITEM_DELETED = "item.deleted"
    APP_DISABLED = "app.disabled"
    APP_ENABLED = "app.enabled"
    CREDENTIAL_CREATED = "credential.created"
    CREDENTIAL_DELETED = "credential.deleted"


class AuditLogEntry(BaseModel):
    id: str = ""
    action: str
    resource_type: str = ""
    resource_id: str = ""
    resource_name: str = ""
    user_id: str = ""
    user_name: str = ""
    user_email: str = ""
    timestamp: str = ""
    details: dict = {}

    def to_cosmos_doc(self) -> dict:
        return {
            "id": self.id,
            "partitionKey": self.action,
            "action": self.action,
            "resourceType": self.resource_type,
            "resourceId": self.resource_id,
            "resourceName": self.resource_name,
            "userId": self.user_id,
            "userName": self.user_name,
            "userEmail": self.user_email,
            "timestamp": self.timestamp,
            "details": self.details,
        }
