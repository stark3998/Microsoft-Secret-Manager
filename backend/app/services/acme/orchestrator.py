"""ACME certificate lifecycle orchestrator.

Coordinates the full flow: order -> DNS challenge -> validation -> issuance -> storage.
Also handles renewal checks and revocation.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

import dns.resolver
from cryptography import x509
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from app.config import settings
from app.services.acme.client import AcmeClient
from app.services.acme.keyvault_store import KeyVaultCertificateStore
from app.services.dns_providers.base import DnsProvider
from app.services.dns_providers.registry import find_provider_for_domain, get_provider
from app.utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)


class CertificateOrchestrator:
    """Orchestrates the full ACME certificate lifecycle."""

    def __init__(self):
        self._store = KeyVaultCertificateStore()

    async def issue_certificate(
        self,
        domains: list[str],
        cert_name: str,
        key_type: str = "ec256",
        dns_provider_key: str | None = None,
        preferred_chain: str | None = None,
        tags: dict[str, str] | None = None,
    ) -> dict:
        """Issue a new certificate via ACME.

        Args:
            domains: Domains to include (first = CN).
            cert_name: Name to store in Key Vault.
            key_type: Key type for the certificate.
            dns_provider_key: Explicit DNS provider key, or auto-detect.
            preferred_chain: Preferred issuer chain.
            tags: Additional tags for Key Vault.

        Returns:
            Dict with certificate details.
        """
        acme = await self._get_acme_client()
        order = await acme.request_certificate(
            domains=domains,
            key_type=key_type,
            preferred_chain=preferred_chain,
        )

        # Get DNS challenges
        dns_challenges = order.get_dns_challenges()
        if not dns_challenges:
            raise RuntimeError("No DNS-01 challenges returned by ACME server")

        # Resolve DNS provider for each domain and create TXT records
        cleanup_tasks = []
        try:
            for challenge_info in dns_challenges:
                domain = challenge_info["domain"]
                provider, zone = await self._resolve_provider(domain, dns_provider_key)

                record_name = provider.get_record_name(domain, zone)
                validation_value = challenge_info["validation"]

                await provider.create_txt_record(zone, record_name, validation_value)
                cleanup_tasks.append((provider, zone, record_name, validation_value))

                logger.info(
                    f"DNS TXT record created: {record_name}.{zone} = {validation_value}"
                )

            # Wait for DNS propagation
            await self._wait_for_dns_propagation(dns_challenges)

            # Answer challenges
            await order.answer_challenges(dns_challenges)

            # Wait a bit for ACME server to validate
            await asyncio.sleep(5)

            # Finalize and get certificate
            cert_pem, key_pem = await order.finalize()

            # Store in Key Vault
            cert_tags = {
                "managed-by": "ms-secret-manager",
                "acme-issuer": settings.acme_endpoint,
                "domains": ",".join(domains),
                "key-type": key_type,
                "issued-at": datetime.now(timezone.utc).isoformat(),
                **(tags or {}),
            }
            version = await self._store.store_certificate(
                cert_name, cert_pem, key_pem, tags=cert_tags
            )

            # Parse cert for metadata
            cert = x509.load_pem_x509_certificate(cert_pem)

            return {
                "certificate_name": cert_name,
                "domains": domains,
                "version": version,
                "not_before": cert.not_valid_before_utc.isoformat(),
                "not_after": cert.not_valid_after_utc.isoformat(),
                "issuer": cert.issuer.rfc4514_string(),
                "serial_number": hex(cert.serial_number),
                "key_type": key_type,
            }

        finally:
            # Always clean up DNS records
            for provider, zone, record_name, value in cleanup_tasks:
                try:
                    await provider.delete_txt_record(zone, record_name, value)
                except Exception as e:
                    logger.warning(f"DNS cleanup failed for {record_name}.{zone}: {e}")

    async def renew_certificate(
        self,
        cert_name: str,
        domains: list[str] | None = None,
        key_type: str = "ec256",
        dns_provider_key: str | None = None,
        force: bool = False,
    ) -> dict | None:
        """Renew a certificate if it's within the renewal window.

        Args:
            cert_name: Key Vault certificate name.
            domains: Override domains (default: read from existing cert).
            key_type: Key type for the new certificate.
            dns_provider_key: DNS provider key.
            force: Force renewal even if not due.

        Returns:
            Certificate details dict, or None if renewal not needed.
        """
        # Check if renewal is needed
        existing_pem = await self._store.get_certificate_pem(cert_name)
        if existing_pem and not force:
            cert = x509.load_pem_x509_certificate(existing_pem)
            days_remaining = (cert.not_valid_after_utc - datetime.now(timezone.utc)).days
            if days_remaining > settings.acme_renew_before_expiry_days:
                logger.info(
                    f"Certificate '{cert_name}' has {days_remaining} days remaining, "
                    f"renewal threshold is {settings.acme_renew_before_expiry_days} days"
                )
                return None

            # Extract domains from existing cert if not provided
            if not domains:
                try:
                    san = cert.extensions.get_extension_for_class(
                        x509.SubjectAlternativeName
                    )
                    domains = san.value.get_values_for_type(x509.DNSName)
                except x509.ExtensionNotFound:
                    cn = cert.subject.get_attributes_for_oid(
                        x509.oid.NameOID.COMMON_NAME
                    )
                    domains = [cn[0].value] if cn else None

        if not domains:
            raise ValueError(
                f"No domains specified and couldn't extract from existing cert '{cert_name}'"
            )

        logger.info(f"Renewing certificate '{cert_name}' for {domains}")
        return await self.issue_certificate(
            domains=domains,
            cert_name=cert_name,
            key_type=key_type,
            dns_provider_key=dns_provider_key,
            tags={"renewed-at": datetime.now(timezone.utc).isoformat()},
        )

    async def revoke_certificate(
        self, cert_name: str, reason: int = 0
    ) -> dict:
        """Revoke a certificate by its Key Vault name.

        Args:
            cert_name: Key Vault certificate name.
            reason: RFC 5280 revocation reason code.

        Returns:
            Dict with revocation details.
        """
        cert_pem = await self._store.get_certificate_pem(cert_name)
        if not cert_pem:
            raise ValueError(f"Certificate '{cert_name}' not found in Key Vault")

        acme = await self._get_acme_client()
        await acme.revoke_certificate(cert_pem, reason)

        # Tag as revoked
        await self._store.tag_certificate(cert_name, {
            "revoked": "true",
            "revoked-at": datetime.now(timezone.utc).isoformat(),
            "revocation-reason": str(reason),
        })

        cert = x509.load_pem_x509_certificate(cert_pem)
        return {
            "certificate_name": cert_name,
            "serial_number": hex(cert.serial_number),
            "revocation_reason": reason,
            "revoked_at": datetime.now(timezone.utc).isoformat(),
        }

    async def check_renewals(self) -> list[dict]:
        """Check all managed certificates and renew those that are due.

        Returns list of renewal results.
        """
        if not settings.acme_auto_renew:
            logger.info("Auto-renewal is disabled")
            return []

        # List certificates tagged as managed by us
        store = self._store
        client = store._get_cert_client()
        results = []

        for cert_props in client.list_properties_of_certificates():
            tags = cert_props.tags or {}
            if tags.get("managed-by") != "ms-secret-manager":
                continue

            try:
                result = await self.renew_certificate(
                    cert_name=cert_props.name,
                    key_type=tags.get("key-type", "ec256"),
                )
                if result:
                    results.append(result)
                    logger.info(f"Renewed certificate '{cert_props.name}'")
            except Exception as e:
                logger.error(f"Failed to renew '{cert_props.name}': {e}")
                results.append({
                    "certificate_name": cert_props.name,
                    "error": str(e),
                })

        return results

    async def _get_acme_client(self) -> AcmeClient:
        """Get an initialized ACME client, loading account key from KV if available."""
        account_key = None
        stored_key_pem = await self._store.get_account_key()
        if stored_key_pem:
            account_key = load_pem_private_key(stored_key_pem, password=None)

        acme = AcmeClient(account_key=account_key)
        await acme.connect()

        # Persist account key if newly generated
        if not stored_key_pem:
            await self._store.store_account_key(acme.get_account_key_pem())

        return acme

    async def _resolve_provider(
        self, domain: str, provider_key: str | None
    ) -> tuple[DnsProvider, str]:
        """Resolve the DNS provider and zone for a domain."""
        if provider_key:
            provider = get_provider(provider_key)
            zones = await provider.list_zones()
            zone = provider.find_zone_for_domain(domain, zones)
            if not zone:
                raise ValueError(
                    f"Domain '{domain}' not found in {provider.name} zones"
                )
            return provider, zone

        # Auto-detect
        result = await find_provider_for_domain(domain)
        if not result:
            raise ValueError(
                f"No DNS provider found for domain '{domain}'. "
                f"Configure a DNS provider or specify one explicitly."
            )
        return result

    async def _wait_for_dns_propagation(
        self,
        challenges_list: list[dict],
        max_wait: int = 120,
        interval: int = 5,
    ) -> None:
        """Wait until DNS TXT records are resolvable."""
        for item in challenges_list:
            domain = item["domain"]
            expected = item["validation"]
            fqdn = f"_acme-challenge.{domain}"

            logger.info(f"Waiting for DNS propagation of {fqdn}...")
            elapsed = 0
            while elapsed < max_wait:
                try:
                    answers = dns.resolver.resolve(fqdn, "TXT")
                    for rdata in answers:
                        txt_value = rdata.strings[0].decode()
                        if txt_value == expected:
                            logger.info(f"DNS propagation confirmed for {fqdn}")
                            break
                    else:
                        raise dns.resolver.NoAnswer()
                    break
                except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
                    await asyncio.sleep(interval)
                    elapsed += interval

            if elapsed >= max_wait:
                logger.warning(
                    f"DNS propagation timeout for {fqdn} after {max_wait}s — "
                    f"proceeding anyway (ACME server may have different DNS view)"
                )
