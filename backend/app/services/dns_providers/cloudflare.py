"""Cloudflare DNS provider for ACME DNS-01 challenges."""

import logging

import httpx

from app.config import settings
from app.services.dns_providers.base import DnsProvider

logger = logging.getLogger(__name__)

CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"


class CloudflareDnsProvider(DnsProvider):
    """DNS provider using Cloudflare API."""

    def __init__(self, api_token: str | None = None):
        self._api_token = api_token or settings.dns_cloudflare_api_token

    @property
    def name(self) -> str:
        return "Cloudflare"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_token}",
            "Content-Type": "application/json",
        }

    async def _get_zone_id(self, zone: str) -> str | None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{CLOUDFLARE_API}/zones",
                headers=self._headers(),
                params={"name": zone},
            )
            resp.raise_for_status()
            data = resp.json()
            if data["result"]:
                return data["result"][0]["id"]
        return None

    async def create_txt_record(
        self, zone: str, record_name: str, value: str, ttl: int = 60
    ) -> None:
        zone_id = await self._get_zone_id(zone)
        if not zone_id:
            raise ValueError(f"Cloudflare zone '{zone}' not found")

        fqdn = f"{record_name}.{zone}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{CLOUDFLARE_API}/zones/{zone_id}/dns_records",
                headers=self._headers(),
                json={
                    "type": "TXT",
                    "name": fqdn,
                    "content": value,
                    "ttl": ttl if ttl > 0 else 1,  # 1 = automatic
                },
            )
            resp.raise_for_status()
        logger.info(f"Cloudflare: created TXT record {fqdn} = {value}")

    async def delete_txt_record(
        self, zone: str, record_name: str, value: str
    ) -> None:
        zone_id = await self._get_zone_id(zone)
        if not zone_id:
            return

        fqdn = f"{record_name}.{zone}"
        async with httpx.AsyncClient() as client:
            # Find matching record
            resp = await client.get(
                f"{CLOUDFLARE_API}/zones/{zone_id}/dns_records",
                headers=self._headers(),
                params={"type": "TXT", "name": fqdn},
            )
            resp.raise_for_status()
            for record in resp.json().get("result", []):
                if record.get("content") == value:
                    del_resp = await client.delete(
                        f"{CLOUDFLARE_API}/zones/{zone_id}/dns_records/{record['id']}",
                        headers=self._headers(),
                    )
                    del_resp.raise_for_status()
                    logger.info(f"Cloudflare: deleted TXT record {fqdn}")
                    return

    async def list_zones(self) -> list[str]:
        zones = []
        page = 1
        async with httpx.AsyncClient() as client:
            while True:
                resp = await client.get(
                    f"{CLOUDFLARE_API}/zones",
                    headers=self._headers(),
                    params={"page": page, "per_page": 50},
                )
                resp.raise_for_status()
                data = resp.json()
                for z in data.get("result", []):
                    zones.append(z["name"])
                info = data.get("result_info", {})
                if page >= info.get("total_pages", 1):
                    break
                page += 1
        return zones
