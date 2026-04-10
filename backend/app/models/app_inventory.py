from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class ActivityClassification(StrEnum):
    ACTIVE = "active"
    LOW_ACTIVITY = "low_activity"
    INACTIVE = "inactive"
    ZOMBIE = "zombie"
    DISABLED = "disabled"


class AppInventoryRecord(BaseModel):
    id: str  # "inventory-{appId}"
    partition_key: str = "inventory"
    item_type: str = "app_inventory"
    app_id: str  # client/application ID
    app_object_id: str = ""
    service_principal_id: str = ""
    app_display_name: str = ""
    app_type: str = ""  # app_registration | enterprise_app | both
    account_enabled: bool = True

    # Credential summary
    total_secrets: int = 0
    active_secrets: int = 0
    expired_secrets: int = 0
    total_certificates: int = 0
    active_certificates: int = 0
    expired_certificates: int = 0
    nearest_expiry: datetime | None = None

    # Activity data (last 30 days)
    sign_in_count_30d: int = 0
    interactive_sign_in_count: int = 0
    non_interactive_sign_in_count: int = 0
    service_principal_sign_in_count: int = 0
    last_sign_in_at: datetime | None = None
    unique_users_30d: int = 0
    top_users: list[dict[str, Any]] = []  # [{userPrincipalName, displayName, count}]

    # Classification
    activity_classification: ActivityClassification = ActivityClassification.ACTIVE

    # Audit
    last_activity_scanned_at: datetime | None = None
    scan_run_id: str = ""
    last_scanned_at: datetime | None = None

    def to_cosmos_doc(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "appId": self.app_id,
            "appObjectId": self.app_object_id,
            "servicePrincipalId": self.service_principal_id,
            "appDisplayName": self.app_display_name,
            "appType": self.app_type,
            "accountEnabled": self.account_enabled,
            "totalSecrets": self.total_secrets,
            "activeSecrets": self.active_secrets,
            "expiredSecrets": self.expired_secrets,
            "totalCertificates": self.total_certificates,
            "activeCertificates": self.active_certificates,
            "expiredCertificates": self.expired_certificates,
            "nearestExpiry": self.nearest_expiry.isoformat() if self.nearest_expiry else None,
            "signInCount30d": self.sign_in_count_30d,
            "interactiveSignInCount": self.interactive_sign_in_count,
            "nonInteractiveSignInCount": self.non_interactive_sign_in_count,
            "servicePrincipalSignInCount": self.service_principal_sign_in_count,
            "lastSignInAt": self.last_sign_in_at.isoformat() if self.last_sign_in_at else None,
            "uniqueUsers30d": self.unique_users_30d,
            "topUsers": self.top_users,
            "activityClassification": self.activity_classification.value,
            "lastActivityScannedAt": self.last_activity_scanned_at.isoformat() if self.last_activity_scanned_at else None,
            "scanRunId": self.scan_run_id,
            "lastScannedAt": self.last_scanned_at.isoformat() if self.last_scanned_at else None,
        }


class DisableActionState(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERTED = "reverted"


class DisableAppAction(BaseModel):
    id: str  # "disable-action-{uuid}"
    partition_key: str = "inventory"
    item_type: str = "disable_action"
    app_id: str
    service_principal_id: str
    app_display_name: str = ""
    state: DisableActionState = DisableActionState.PENDING
    previous_enabled_state: bool = True
    initiated_at: datetime | None = None
    initiated_by: str = ""
    completed_at: datetime | None = None
    failed_at: datetime | None = None
    failure_reason: str = ""
    reverted_at: datetime | None = None
    reverted_by: str = ""
    history: list[dict[str, Any]] = []

    def to_cosmos_doc(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "appId": self.app_id,
            "servicePrincipalId": self.service_principal_id,
            "appDisplayName": self.app_display_name,
            "state": self.state.value,
            "previousEnabledState": self.previous_enabled_state,
            "initiatedAt": self.initiated_at.isoformat() if self.initiated_at else None,
            "initiatedBy": self.initiated_by,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "failedAt": self.failed_at.isoformat() if self.failed_at else None,
            "failureReason": self.failure_reason,
            "revertedAt": self.reverted_at.isoformat() if self.reverted_at else None,
            "revertedBy": self.reverted_by,
            "history": self.history,
        }
