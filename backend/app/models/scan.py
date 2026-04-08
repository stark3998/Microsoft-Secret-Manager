from datetime import datetime

from pydantic import BaseModel


class ScanRun(BaseModel):
    id: str
    status: str  # running | completed | failed
    trigger: str  # scheduled | manual | eventgrid
    started_at: datetime
    completed_at: datetime | None = None
    subscriptions_scanned: int = 0
    vaults_scanned: int = 0
    items_found: int = 0
    app_registrations_scanned: int = 0
    enterprise_apps_scanned: int = 0
    new_expired_found: int = 0
    errors: list[str] = []
    triggered_by: str = "system"

    def to_cosmos_doc(self) -> dict:
        return {
            "id": self.id,
            "status": self.status,
            "trigger": self.trigger,
            "startedAt": self.started_at.isoformat(),
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "subscriptionsScanned": self.subscriptions_scanned,
            "vaultsScanned": self.vaults_scanned,
            "itemsFound": self.items_found,
            "appRegistrationsScanned": self.app_registrations_scanned,
            "enterpriseAppsScanned": self.enterprise_apps_scanned,
            "newExpiredFound": self.new_expired_found,
            "errors": self.errors,
            "triggeredBy": self.triggered_by,
        }
