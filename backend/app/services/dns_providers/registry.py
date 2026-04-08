"""DNS provider registry — factory for getting configured providers."""

import logging

from app.config import settings
from app.services.dns_providers.base import DnsProvider

logger = logging.getLogger(__name__)


def get_available_providers() -> dict[str, DnsProvider]:
    """Return a dict of provider_key -> DnsProvider for all configured providers."""
    providers: dict[str, DnsProvider] = {}

    if settings.dns_azure_subscription_id:
        from app.services.dns_providers.azure_dns import AzureDnsProvider
        providers["azure"] = AzureDnsProvider()

    if settings.dns_cloudflare_api_token:
        from app.services.dns_providers.cloudflare import CloudflareDnsProvider
        providers["cloudflare"] = CloudflareDnsProvider()

    if settings.dns_route53_access_key and settings.dns_route53_secret_key:
        from app.services.dns_providers.route53 import Route53DnsProvider
        providers["route53"] = Route53DnsProvider()

    return providers


def get_provider(provider_key: str) -> DnsProvider:
    """Get a specific DNS provider by key.

    Raises ValueError if the provider is not configured.
    """
    providers = get_available_providers()
    if provider_key not in providers:
        available = list(providers.keys()) or ["none configured"]
        raise ValueError(
            f"DNS provider '{provider_key}' is not configured. "
            f"Available: {', '.join(available)}"
        )
    return providers[provider_key]


async def find_provider_for_domain(domain: str) -> tuple[DnsProvider, str] | None:
    """Auto-detect which provider manages a domain's DNS zone.

    Returns (provider, zone_name) or None if no provider matches.
    """
    for key, provider in get_available_providers().items():
        try:
            zones = await provider.list_zones()
            zone = provider.find_zone_for_domain(domain, zones)
            if zone:
                logger.info(f"Domain '{domain}' matched zone '{zone}' on {provider.name}")
                return provider, zone
        except Exception as e:
            logger.warning(f"Error checking {provider.name} for domain '{domain}': {e}")
    return None
