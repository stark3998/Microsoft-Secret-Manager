from azure.identity import DefaultAzureCredential
from azure.core.credentials import AccessToken

from app.config import settings

_credential: DefaultAzureCredential | None = None

# Map environment names to authority hosts
AUTHORITY_HOSTS = {
    "AzureCloud": "https://login.microsoftonline.com",
    "AzureChinaCloud": "https://login.chinacloudapi.cn",
    "AzureUSGovernment": "https://login.microsoftonline.us",
}


class DelegatedTokenCredential:
    """Credential that returns pre-acquired user-delegated tokens based on the requested scope.

    The frontend acquires tokens for Graph, ARM, and Key Vault resources via MSAL
    and passes them to the backend.  This credential routes each SDK call to the
    correct token by matching the requested scope to a known resource domain.
    """

    RESOURCE_MAP = {
        "graph.microsoft.com": "graph",
        "management.azure.com": "management",
        "management.chinacloudapi.cn": "management",
        "management.usgovcloudapi.net": "management",
        "vault.azure.net": "keyvault",
        "vault.azure.cn": "keyvault",
        "vault.usgovcloudapi.net": "keyvault",
    }

    def __init__(self, tokens: dict[str, str]):
        """tokens keys: 'graph', 'management', 'keyvault' (all optional)."""
        self._tokens = {k: v for k, v in tokens.items() if v}

    def get_token(self, *scopes, **kwargs) -> AccessToken:
        for scope in scopes:
            for domain, key in self.RESOURCE_MAP.items():
                if domain in scope and key in self._tokens:
                    return AccessToken(self._tokens[key], 0)
        available = list(self._tokens.keys())
        raise ValueError(
            f"No delegated token available for scopes {scopes}. "
            f"Available resource keys: {available}"
        )

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


def get_azure_credential() -> DefaultAzureCredential:
    """Get a shared DefaultAzureCredential instance.

    Supports multi-cloud (Public/China/Government) and user-assigned managed identity.
    """
    global _credential
    if _credential is None:
        kwargs: dict = {}

        authority_host = AUTHORITY_HOSTS.get(settings.azure_environment)
        if authority_host:
            kwargs["authority"] = authority_host

        if settings.managed_identity_client_id:
            kwargs["managed_identity_client_id"] = settings.managed_identity_client_id

        _credential = DefaultAzureCredential(**kwargs)
    return _credential
