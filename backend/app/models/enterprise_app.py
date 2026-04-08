from datetime import datetime
from typing import Any

from pydantic import BaseModel


class EnterpriseAppCertificate(BaseModel):
    id: str
    partition_key: str = "entra"
    item_type: str = "saml_certificate"
    source: str = "enterprise_app"
    service_principal_id: str
    app_id: str = ""
    app_display_name: str = ""
    cert_type: str = ""  # signing | encryption
    thumbprint: str = ""
    subject: str = ""
    expires_on: datetime | None = None
    created_on: datetime | None = None
    expiration_status: str = "healthy"
    days_until_expiration: int | None = None
    last_scanned_at: datetime | None = None
    scan_run_id: str = ""

    def to_cosmos_doc(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "partitionKey": self.partition_key,
            "itemType": self.item_type,
            "source": self.source,
            "servicePrincipalId": self.service_principal_id,
            "appId": self.app_id,
            "appDisplayName": self.app_display_name,
            "certType": self.cert_type,
            "thumbprint": self.thumbprint,
            "subject": self.subject,
            "expiresOn": self.expires_on.isoformat() if self.expires_on else None,
            "createdOn": self.created_on.isoformat() if self.created_on else None,
            "expirationStatus": self.expiration_status,
            "daysUntilExpiration": self.days_until_expiration,
            "lastScannedAt": self.last_scanned_at.isoformat() if self.last_scanned_at else None,
            "scanRunId": self.scan_run_id,
        }
