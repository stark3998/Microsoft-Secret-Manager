from enum import StrEnum


class Role(StrEnum):
    ADMIN = "Admin"
    VIEWER = "Viewer"


class Permission(StrEnum):
    """Granular per-action permissions mapped from Entra ID App Roles."""
    TRIGGER_SCAN = "SecretManager.TriggerScan"
    MANAGE_SETTINGS = "SecretManager.ManageSettings"
    ISSUE_CERTIFICATE = "SecretManager.IssueCertificate"
    RENEW_CERTIFICATE = "SecretManager.RenewCertificate"
    REVOKE_CERTIFICATE = "SecretManager.RevokeCertificate"
    ACKNOWLEDGE_ITEM = "SecretManager.AcknowledgeItem"
    EXPORT_DATA = "SecretManager.ExportData"
    MANAGE_DNS = "SecretManager.ManageDns"
    ROTATE_SAML_CERTIFICATE = "SecretManager.RotateSamlCertificate"


# Admin role implicitly has all permissions
ADMIN_PERMISSIONS = set(Permission)

# Viewer role permissions
VIEWER_PERMISSIONS = {
    Permission.EXPORT_DATA,
}
