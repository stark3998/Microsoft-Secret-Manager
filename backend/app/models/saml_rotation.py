from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class RotationState(StrEnum):
    STAGED = "staged"
    NOTIFIED = "notified"
    ACTIVATED = "activated"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class SamlRotationJob(BaseModel):
    id: str
    partition_key: str = "saml_rotation"
    item_type: str = "saml_rotation_job"
    service_principal_id: str
    app_id: str = ""
    app_display_name: str = ""
    state: RotationState
    old_thumbprint: str
    old_key_id: str = ""
    new_thumbprint: str = ""
    new_key_id: str = ""
    new_cert_expires_on: datetime | None = None
    initiated_at: datetime | None = None
    initiated_by: str = "system"
    staged_at: datetime | None = None
    notified_at: datetime | None = None
    activated_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancelled_by: str = ""
    failed_at: datetime | None = None
    failure_reason: str = ""
    history: list[dict[str, Any]] = []

    def to_cosmos_doc(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "servicePrincipalId": self.service_principal_id,
            "appId": self.app_id,
            "appDisplayName": self.app_display_name,
            "state": self.state,
            "oldThumbprint": self.old_thumbprint,
            "oldKeyId": self.old_key_id,
            "newThumbprint": self.new_thumbprint,
            "newKeyId": self.new_key_id,
            "newCertExpiresOn": self.new_cert_expires_on.isoformat() if self.new_cert_expires_on else None,
            "initiatedAt": self.initiated_at.isoformat() if self.initiated_at else None,
            "initiatedBy": self.initiated_by,
            "stagedAt": self.staged_at.isoformat() if self.staged_at else None,
            "notifiedAt": self.notified_at.isoformat() if self.notified_at else None,
            "activatedAt": self.activated_at.isoformat() if self.activated_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "cancelledAt": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "cancelledBy": self.cancelled_by,
            "failedAt": self.failed_at.isoformat() if self.failed_at else None,
            "failureReason": self.failure_reason,
            "history": self.history,
        }
