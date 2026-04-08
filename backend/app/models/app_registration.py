from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AppRegistrationCredential(BaseModel):
    id: str
    partition_key: str = "entra"
    item_type: str  # client_secret | certificate
    source: str = "app_registration"
    app_object_id: str
    app_id: str  # client ID
    app_display_name: str = ""
    credential_id: str = ""
    credential_display_name: str = ""
    expires_on: datetime | None = None
    created_on: datetime | None = None
    thumbprint: str | None = None
    subject: str | None = None
    expiration_status: str = "healthy"
    days_until_expiration: int | None = None
    last_scanned_at: datetime | None = None
    scan_run_id: str = ""

    def to_cosmos_doc(self) -> dict[str, Any]:
        doc = {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "source": self.source,
            "appObjectId": self.app_object_id,
            "appId": self.app_id,
            "appDisplayName": self.app_display_name,
            "credentialId": self.credential_id,
            "credentialDisplayName": self.credential_display_name,
            "expiresOn": self.expires_on.isoformat() if self.expires_on else None,
            "createdOn": self.created_on.isoformat() if self.created_on else None,
            "thumbprint": self.thumbprint,
            "subject": self.subject,
            "expirationStatus": self.expiration_status,
            "daysUntilExpiration": self.days_until_expiration,
            "lastScannedAt": self.last_scanned_at.isoformat() if self.last_scanned_at else None,
            "scanRunId": self.scan_run_id,
        }
        return doc
