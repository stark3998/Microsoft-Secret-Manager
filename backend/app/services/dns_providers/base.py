"""Base interface for DNS provider plugins."""

from abc import ABC, abstractmethod


class DnsProvider(ABC):
    """Abstract base class for DNS-01 challenge providers.

    Each provider must implement methods to create and clean up
    TXT records used for ACME DNS-01 domain validation.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""

    @abstractmethod
    async def create_txt_record(
        self, zone: str, record_name: str, value: str, ttl: int = 60
    ) -> None:
        """Create a DNS TXT record for ACME validation.

        Args:
            zone: DNS zone name (e.g., "example.com").
            record_name: Relative record name (e.g., "_acme-challenge.www").
            value: TXT record value (the ACME challenge token digest).
            ttl: Time-to-live in seconds.
        """

    @abstractmethod
    async def delete_txt_record(
        self, zone: str, record_name: str, value: str
    ) -> None:
        """Remove the DNS TXT record after validation completes.

        Args:
            zone: DNS zone name.
            record_name: Relative record name.
            value: TXT record value to remove (for multi-value TXT records).
        """

    @abstractmethod
    async def list_zones(self) -> list[str]:
        """List all DNS zones accessible by this provider."""

    def find_zone_for_domain(self, domain: str, zones: list[str]) -> str | None:
        """Find the most specific matching zone for a domain.

        Returns the longest zone suffix that matches the domain.
        """
        domain = domain.rstrip(".")
        candidates = []
        for zone in zones:
            zone_clean = zone.rstrip(".")
            if domain == zone_clean or domain.endswith("." + zone_clean):
                candidates.append(zone_clean)
        if not candidates:
            return None
        return max(candidates, key=len)

    def get_record_name(self, domain: str, zone: str) -> str:
        """Compute the relative record name for _acme-challenge.

        For domain "www.example.com" and zone "example.com",
        returns "_acme-challenge.www".
        """
        domain = domain.rstrip(".")
        zone = zone.rstrip(".")
        if domain == zone:
            return "_acme-challenge"
        prefix = domain[: -(len(zone) + 1)]
        return f"_acme-challenge.{prefix}"
