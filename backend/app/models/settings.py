from pydantic import BaseModel


class ThresholdTier(BaseModel):
    name: str
    days_before_expiry: int
    color: str


class ThresholdSettings(BaseModel):
    tiers: list[ThresholdTier]


class NotificationSettings(BaseModel):
    email_enabled: bool = False
    email_recipients: list[str] = []
    email_from: str = ""
    teams_enabled: bool = False
    teams_webhook_url: str = ""
    notify_on_status_change: bool = True
    daily_digest_enabled: bool = False
    daily_digest_time: str = "08:00"


class ScheduleSettings(BaseModel):
    cron_expression: str = "0 6 * * *"
    enabled: bool = True
    subscription_filter: list[str] = []


class AzureConnectionSettings(BaseModel):
    tenant_id: str = ""
    subscription_filter: list[str] = []
