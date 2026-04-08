"""Azure DNS provider for ACME DNS-01 challenges."""

import logging

from azure.mgmt.dns import DnsManagementClient
from azure.mgmt.dns.models import RecordSet, TxtRecord

from app.config import settings
from app.services.dns_providers.base import DnsProvider
from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)


class AzureDnsProvider(DnsProvider):
    """DNS provider using Azure DNS zones."""

    def __init__(
        self,
        subscription_id: str | None = None,
        resource_group: str | None = None,
    ):
        self._subscription_id = subscription_id or settings.dns_azure_subscription_id
        self._resource_group = resource_group
        self._client: DnsManagementClient | None = None

    @property
    def name(self) -> str:
        return "Azure DNS"

    def _get_client(self) -> DnsManagementClient:
        if self._client is None:
            self._client = DnsManagementClient(
                credential=get_azure_credential(),
                subscription_id=self._subscription_id,
            )
        return self._client

    async def create_txt_record(
        self, zone: str, record_name: str, value: str, ttl: int = 60
    ) -> None:
        client = self._get_client()
        rg = self._resource_group or await self._find_resource_group(zone)
        if not rg:
            raise ValueError(f"Could not find resource group for zone '{zone}'")

        # Try to get existing record set to append values
        existing_values = []
        try:
            existing = client.record_sets.get(rg, zone, record_name, "TXT")
            if existing.txt_records:
                existing_values = [r.value[0] for r in existing.txt_records if r.value]
        except Exception:
            pass

        all_values = list(set(existing_values + [value]))
        txt_records = [TxtRecord(value=[v]) for v in all_values]

        client.record_sets.create_or_update(
            rg,
            zone,
            record_name,
            "TXT",
            RecordSet(ttl=ttl, txt_records=txt_records),
        )
        logger.info(f"Azure DNS: created TXT record {record_name}.{zone} = {value}")

    async def delete_txt_record(
        self, zone: str, record_name: str, value: str
    ) -> None:
        client = self._get_client()
        rg = self._resource_group or await self._find_resource_group(zone)
        if not rg:
            return

        try:
            existing = client.record_sets.get(rg, zone, record_name, "TXT")
            remaining = [
                TxtRecord(value=r.value)
                for r in (existing.txt_records or [])
                if r.value and r.value[0] != value
            ]
            if remaining:
                client.record_sets.create_or_update(
                    rg,
                    zone,
                    record_name,
                    "TXT",
                    RecordSet(ttl=existing.ttl, txt_records=remaining),
                )
            else:
                client.record_sets.delete(rg, zone, record_name, "TXT")
            logger.info(f"Azure DNS: deleted TXT record {record_name}.{zone}")
        except Exception as e:
            logger.warning(f"Azure DNS: failed to delete TXT record: {e}")

    async def list_zones(self) -> list[str]:
        client = self._get_client()
        zones = []
        for zone in client.zones.list():
            zones.append(zone.name)
        return zones

    async def _find_resource_group(self, zone_name: str) -> str | None:
        """Find the resource group containing a DNS zone."""
        client = self._get_client()
        for zone in client.zones.list():
            if zone.name == zone_name and zone.id:
                # Zone ID format: /subscriptions/.../resourceGroups/{rg}/providers/...
                parts = zone.id.split("/")
                rg_idx = next(
                    (i for i, p in enumerate(parts) if p.lower() == "resourcegroups"),
                    None,
                )
                if rg_idx is not None and rg_idx + 1 < len(parts):
                    return parts[rg_idx + 1]
        return None
