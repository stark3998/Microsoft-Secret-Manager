"""AWS Route 53 DNS provider for ACME DNS-01 challenges."""

import logging
import time

import httpx

from app.config import settings
from app.services.dns_providers.base import DnsProvider

logger = logging.getLogger(__name__)

# Minimal Route 53 client using httpx + AWS Signature V4
# For production, consider using aiobotocore, but we keep dependencies light here.

import hashlib
import hmac
import datetime


class Route53DnsProvider(DnsProvider):
    """DNS provider using AWS Route 53.

    Uses direct HTTP calls with AWS Signature V4 to avoid
    heavy boto3 dependency. Requires access key + secret key.
    """

    def __init__(
        self,
        access_key: str | None = None,
        secret_key: str | None = None,
        region: str | None = None,
    ):
        self._access_key = access_key or settings.dns_route53_access_key
        self._secret_key = secret_key or settings.dns_route53_secret_key
        self._region = region or settings.dns_route53_region

    @property
    def name(self) -> str:
        return "AWS Route 53"

    def _sign(self, method: str, url: str, headers: dict, payload: str = "") -> dict:
        """AWS Signature Version 4 signing."""
        service = "route53"
        host = "route53.amazonaws.com"
        now = datetime.datetime.now(datetime.timezone.utc)
        datestamp = now.strftime("%Y%m%d")
        amzdate = now.strftime("%Y%m%dT%H%M%SZ")

        canonical_uri = url.split(host)[-1] if host in url else url
        canonical_querystring = ""
        payload_hash = hashlib.sha256(payload.encode()).hexdigest()

        headers_to_sign = {
            "host": host,
            "x-amz-date": amzdate,
            "x-amz-content-sha256": payload_hash,
        }
        signed_headers = ";".join(sorted(headers_to_sign.keys()))
        canonical_headers = "".join(
            f"{k}:{v}\n" for k, v in sorted(headers_to_sign.items())
        )

        canonical_request = "\n".join([
            method, canonical_uri, canonical_querystring,
            canonical_headers, signed_headers, payload_hash,
        ])

        algorithm = "AWS4-HMAC-SHA256"
        credential_scope = f"{datestamp}/us-east-1/{service}/aws4_request"
        string_to_sign = "\n".join([
            algorithm, amzdate, credential_scope,
            hashlib.sha256(canonical_request.encode()).hexdigest(),
        ])

        def _hmac(key: bytes, msg: str) -> bytes:
            return hmac.new(key, msg.encode(), hashlib.sha256).digest()

        signing_key = _hmac(
            _hmac(
                _hmac(
                    _hmac(f"AWS4{self._secret_key}".encode(), datestamp),
                    "us-east-1",
                ),
                service,
            ),
            "aws4_request",
        )

        signature = hmac.new(
            signing_key, string_to_sign.encode(), hashlib.sha256
        ).hexdigest()

        auth_header = (
            f"{algorithm} Credential={self._access_key}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        return {
            **headers,
            "x-amz-date": amzdate,
            "x-amz-content-sha256": payload_hash,
            "Authorization": auth_header,
        }

    async def _get_hosted_zone_id(self, zone: str) -> str | None:
        """Find the hosted zone ID for a domain."""
        url = f"https://route53.amazonaws.com/2013-04-01/hostedzonesbyname?dnsname={zone}&maxitems=1"
        headers = self._sign("GET", "/2013-04-01/hostedzonesbyname", {})
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            # Parse XML response
            text = resp.text
            # Simple extraction — zone ID is in <Id>/hostedzone/XXXXX</Id>
            import re
            match = re.search(r"<Id>/hostedzone/([^<]+)</Id>", text)
            if match:
                return match.group(1)
        return None

    async def create_txt_record(
        self, zone: str, record_name: str, value: str, ttl: int = 60
    ) -> None:
        zone_id = await self._get_hosted_zone_id(zone)
        if not zone_id:
            raise ValueError(f"Route 53 hosted zone '{zone}' not found")

        fqdn = f"{record_name}.{zone}"
        xml_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <ChangeBatch>
    <Changes>
      <Change>
        <Action>UPSERT</Action>
        <ResourceRecordSet>
          <Name>{fqdn}</Name>
          <Type>TXT</Type>
          <TTL>{ttl}</TTL>
          <ResourceRecords>
            <ResourceRecord>
              <Value>"{value}"</Value>
            </ResourceRecord>
          </ResourceRecords>
        </ResourceRecordSet>
      </Change>
    </Changes>
  </ChangeBatch>
</ChangeResourceRecordSetsRequest>"""

        url_path = f"/2013-04-01/hostedzone/{zone_id}/rrset"
        headers = self._sign("POST", url_path, {"Content-Type": "application/xml"}, xml_body)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://route53.amazonaws.com{url_path}",
                headers=headers,
                content=xml_body,
            )
            resp.raise_for_status()
        logger.info(f"Route 53: created TXT record {fqdn} = {value}")

    async def delete_txt_record(
        self, zone: str, record_name: str, value: str
    ) -> None:
        zone_id = await self._get_hosted_zone_id(zone)
        if not zone_id:
            return

        fqdn = f"{record_name}.{zone}"
        xml_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <ChangeBatch>
    <Changes>
      <Change>
        <Action>DELETE</Action>
        <ResourceRecordSet>
          <Name>{fqdn}</Name>
          <Type>TXT</Type>
          <TTL>60</TTL>
          <ResourceRecords>
            <ResourceRecord>
              <Value>"{value}"</Value>
            </ResourceRecord>
          </ResourceRecords>
        </ResourceRecordSet>
      </Change>
    </Changes>
  </ChangeBatch>
</ChangeResourceRecordSetsRequest>"""

        url_path = f"/2013-04-01/hostedzone/{zone_id}/rrset"
        headers = self._sign("POST", url_path, {"Content-Type": "application/xml"}, xml_body)
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"https://route53.amazonaws.com{url_path}",
                    headers=headers,
                    content=xml_body,
                )
                resp.raise_for_status()
                logger.info(f"Route 53: deleted TXT record {fqdn}")
            except Exception as e:
                logger.warning(f"Route 53: failed to delete TXT record: {e}")

    async def list_zones(self) -> list[str]:
        zones = []
        url_path = "/2013-04-01/hostedzone?maxitems=100"
        headers = self._sign("GET", url_path, {})
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://route53.amazonaws.com{url_path}",
                headers=headers,
            )
            resp.raise_for_status()
            import re
            for match in re.finditer(r"<Name>([^<]+)</Name>", resp.text):
                zone_name = match.group(1).rstrip(".")
                if zone_name and "." in zone_name:
                    zones.append(zone_name)
        return zones
