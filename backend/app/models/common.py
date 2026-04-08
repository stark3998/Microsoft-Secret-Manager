from enum import StrEnum


class ItemType(StrEnum):
    SECRET = "secret"
    KEY = "key"
    CERTIFICATE = "certificate"
    CLIENT_SECRET = "client_secret"
    SAML_CERTIFICATE = "saml_certificate"
    SAML_ROTATION_JOB = "saml_rotation_job"


class Source(StrEnum):
    KEYVAULT = "keyvault"
    APP_REGISTRATION = "app_registration"
    ENTERPRISE_APP = "enterprise_app"


class ExpirationStatus(StrEnum):
    EXPIRED = "expired"
    CRITICAL = "critical"
    WARNING = "warning"
    NOTICE = "notice"
    HEALTHY = "healthy"
    NO_EXPIRY = "no_expiry"


class ScanStatus(StrEnum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScanTrigger(StrEnum):
    SCHEDULED = "scheduled"
    MANUAL = "manual"
    EVENTGRID = "eventgrid"
