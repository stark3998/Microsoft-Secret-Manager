from azure.identity import DefaultAzureCredential, DefaultAzureCredentialOptions

from app.config import settings

_credential: DefaultAzureCredential | None = None

# Map environment names to authority hosts
AUTHORITY_HOSTS = {
    "AzureCloud": "https://login.microsoftonline.com",
    "AzureChinaCloud": "https://login.chinacloudapi.cn",
    "AzureUSGovernment": "https://login.microsoftonline.us",
}


def get_azure_credential() -> DefaultAzureCredential:
    """Get a shared DefaultAzureCredential instance.

    Supports multi-cloud (Public/China/Government) and user-assigned managed identity.
    """
    global _credential
    if _credential is None:
        options = DefaultAzureCredentialOptions()

        authority_host = AUTHORITY_HOSTS.get(settings.azure_environment)
        if authority_host:
            options.authority = authority_host

        if settings.managed_identity_client_id:
            options.managed_identity_client_id = settings.managed_identity_client_id

        _credential = DefaultAzureCredential(**{
            k: v for k, v in {
                "authority": getattr(options, "authority", None),
                "managed_identity_client_id": getattr(options, "managed_identity_client_id", None),
            }.items() if v
        }) if settings.managed_identity_client_id or settings.azure_environment != "AzureCloud" else DefaultAzureCredential()
    return _credential
