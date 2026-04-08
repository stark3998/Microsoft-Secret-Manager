from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Azure / Entra ID
    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""
    azure_environment: str = "AzureCloud"  # AzureCloud, AzureChinaCloud, AzureUSGovernment
    managed_identity_client_id: str = ""  # For user-assigned managed identity

    # MSAL token validation
    msal_client_id: str = ""
    msal_authority: str = ""

    # Cosmos DB
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database: str = "secret-manager"

    # Notifications
    notification_email_from: str = ""
    teams_webhook_url: str = ""
    slack_webhook_url: str = ""
    generic_webhook_url: str = ""

    # Scheduler
    scan_cron_expression: str = "0 6 * * *"
    purge_cron_expression: str = "0 0 1 * *"  # Monthly on the 1st

    # ACME Certificate Management
    acme_enabled: bool = False
    acme_endpoint: str = "https://acme-v02.api.letsencrypt.org/directory"
    acme_contacts: str = ""  # Comma-separated email addresses
    acme_key_vault_url: str = ""  # Key Vault for storing ACME-issued certs
    acme_eab_kid: str = ""  # External Account Binding Key ID
    acme_eab_hmac_key: str = ""  # External Account Binding HMAC Key
    acme_preferred_chain: str = ""
    acme_renew_before_expiry_days: int = 30
    acme_auto_renew: bool = True
    acme_renewal_cron: str = "0 0 * * *"  # Daily at midnight

    # DNS Provider Configuration
    dns_azure_subscription_id: str = ""
    dns_cloudflare_api_token: str = ""
    dns_route53_access_key: str = ""
    dns_route53_secret_key: str = ""
    dns_route53_region: str = "us-east-1"

    # Observability
    applicationinsights_connection_string: str = ""
    otel_exporter_otlp_endpoint: str = ""

    # Export
    export_max_items: int = 10000

    @property
    def msal_issuer(self) -> str:
        authority_host = self.authority_host
        return f"{authority_host}/{self.azure_tenant_id}/v2.0"

    @property
    def msal_jwks_uri(self) -> str:
        authority_host = self.authority_host
        return f"{authority_host}/{self.azure_tenant_id}/discovery/v2.0/keys"

    @property
    def authority_host(self) -> str:
        hosts = {
            "AzureCloud": "https://login.microsoftonline.com",
            "AzureChinaCloud": "https://login.chinacloudapi.cn",
            "AzureUSGovernment": "https://login.microsoftonline.us",
        }
        return hosts.get(self.azure_environment, "https://login.microsoftonline.com")

    @property
    def resource_manager_endpoint(self) -> str:
        endpoints = {
            "AzureCloud": "https://management.azure.com",
            "AzureChinaCloud": "https://management.chinacloudapi.cn",
            "AzureUSGovernment": "https://management.usgovcloudapi.net",
        }
        return endpoints.get(self.azure_environment, "https://management.azure.com")

    @property
    def key_vault_suffix(self) -> str:
        suffixes = {
            "AzureCloud": "vault.azure.net",
            "AzureChinaCloud": "vault.azure.cn",
            "AzureUSGovernment": "vault.usgovcloudapi.net",
        }
        return suffixes.get(self.azure_environment, "vault.azure.net")

    @property
    def acme_contact_list(self) -> list[str]:
        if not self.acme_contacts:
            return []
        return [f"mailto:{e.strip()}" for e in self.acme_contacts.split(",") if e.strip()]


settings = Settings()
