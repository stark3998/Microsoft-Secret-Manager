"""ACME v2 client for certificate issuance and management."""

import asyncio
import logging
from datetime import datetime, timezone

import josepy as jose
from acme import client as acme_client
from acme import challenges, messages
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.x509.oid import NameOID

from app.config import settings

logger = logging.getLogger(__name__)


class AcmeClient:
    """Wrapper around the ACME v2 protocol client.

    Handles account registration, order creation, DNS-01 challenges,
    certificate issuance, and revocation.
    """

    def __init__(
        self,
        directory_url: str | None = None,
        account_key: rsa.RSAPrivateKey | ec.EllipticCurvePrivateKey | None = None,
        eab_kid: str | None = None,
        eab_hmac_key: str | None = None,
    ):
        self._directory_url = directory_url or settings.acme_endpoint
        self._account_key = account_key
        self._eab_kid = eab_kid or settings.acme_eab_kid
        self._eab_hmac_key = eab_hmac_key or settings.acme_eab_hmac_key
        self._client: acme_client.ClientV2 | None = None
        self._registration = None

    @property
    def is_registered(self) -> bool:
        return self._registration is not None

    def _ensure_account_key(self) -> jose.JWK:
        """Generate or return the ACME account key."""
        if self._account_key is None:
            self._account_key = ec.generate_private_key(ec.SECP256R1())
        return jose.JWKEC(key=self._account_key) if isinstance(
            self._account_key, ec.EllipticCurvePrivateKey
        ) else jose.JWKRSA(key=self._account_key)

    async def connect(self) -> None:
        """Initialize the ACME client and register/find account."""
        jwk = self._ensure_account_key()
        network = acme_client.ClientNetwork(jwk)
        directory = messages.Directory.from_json(
            network.get(self._directory_url).json()
        )
        self._client = acme_client.ClientV2(directory, network)

        # Build registration message
        reg_kwargs: dict = {
            "contact": tuple(settings.acme_contact_list) if settings.acme_contact_list else (),
            "terms_of_service_agreed": True,
        }

        # External Account Binding (for ZeroSSL, Google Trust, etc.)
        if self._eab_kid and self._eab_hmac_key:
            import base64
            eab_hmac_bytes = base64.urlsafe_b64decode(self._eab_hmac_key + "==")
            eab = messages.ExternalAccountBinding.from_data(
                account_public_key=jwk,
                kid=self._eab_kid,
                hmac_key=eab_hmac_bytes,
                directory=directory,
            )
            reg_kwargs["external_account_binding"] = eab

        new_reg = messages.NewRegistration(**reg_kwargs)

        try:
            self._registration = self._client.new_account(new_reg)
            logger.info(f"ACME account registered: {self._registration.uri}")
        except Exception:
            # Account may already exist — try to find it
            try:
                self._registration = self._client.query_registration(
                    messages.NewRegistration(only_return_existing=True)
                )
                logger.info(f"ACME account found: {self._registration.uri}")
            except Exception as e:
                logger.exception(f"Failed to register/find ACME account: {e}")
                raise

    async def request_certificate(
        self,
        domains: list[str],
        key_type: str = "ec256",
        preferred_chain: str | None = None,
    ) -> "AcmeOrder":
        """Create a new certificate order for the given domains.

        Args:
            domains: List of domain names (first is CN, rest are SANs).
            key_type: Key type — "ec256", "ec384", "rsa2048", "rsa4096".
            preferred_chain: Preferred issuer chain name (optional).

        Returns:
            AcmeOrder with challenge details to be fulfilled.
        """
        if not self._client:
            await self.connect()

        order = self._client.new_order(
            acme_client.ClientV2.DER_CONTENT_TYPE,
            identifiers=[
                messages.Identifier(typ=messages.IDENTIFIER_FQDN, value=d)
                for d in domains
            ],
        )
        logger.info(f"ACME order created for {domains}")

        return AcmeOrder(
            client=self._client,
            order=order,
            domains=domains,
            key_type=key_type,
            preferred_chain=preferred_chain or settings.acme_preferred_chain,
        )

    async def revoke_certificate(self, cert_pem: bytes, reason: int = 0) -> None:
        """Revoke a certificate.

        Args:
            cert_pem: PEM-encoded certificate.
            reason: RFC 5280 revocation reason code (0=unspecified, 1=keyCompromise, etc.)
        """
        if not self._client:
            await self.connect()

        cert = x509.load_pem_x509_certificate(cert_pem)
        self._client.revoke(
            jose.ComparableX509(cert),
            reason,
        )
        logger.info("Certificate revoked successfully")

    def get_account_key_pem(self) -> bytes:
        """Export the account private key as PEM."""
        if self._account_key is None:
            raise ValueError("No account key generated yet")
        return self._account_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )


class AcmeOrder:
    """Represents an in-progress ACME certificate order."""

    def __init__(
        self,
        client: acme_client.ClientV2,
        order,
        domains: list[str],
        key_type: str = "ec256",
        preferred_chain: str | None = None,
    ):
        self._client = client
        self._order = order
        self.domains = domains
        self._key_type = key_type
        self._preferred_chain = preferred_chain

    def get_dns_challenges(self) -> list[dict]:
        """Extract DNS-01 challenges from the order.

        Returns list of dicts with:
            - domain: the domain name
            - token: challenge token
            - validation: the value to put in the TXT record
            - challenge: the challenge object (for answering)
        """
        result = []
        for authz in self._order.authorizations:
            domain = authz.body.identifier.value
            for challenge_body in authz.body.challenges:
                if isinstance(challenge_body.chall, challenges.DNS01):
                    validation = challenge_body.validation(
                        self._client.net.key
                    )
                    result.append({
                        "domain": domain,
                        "token": challenge_body.chall.encode("token"),
                        "validation": validation,
                        "challenge": challenge_body,
                    })
        return result

    async def answer_challenges(self, challenge_list: list[dict]) -> None:
        """Tell the ACME server we're ready for validation."""
        for item in challenge_list:
            self._client.answer_challenge(item["challenge"], item["challenge"].response(self._client.net.key))
        logger.info(f"Answered {len(challenge_list)} DNS-01 challenges")

    async def finalize(self) -> tuple[bytes, bytes]:
        """Generate CSR, finalize the order, and return (cert_pem, key_pem).

        Returns:
            Tuple of (certificate PEM bytes, private key PEM bytes).
        """
        # Generate private key for the certificate
        private_key = self._generate_key()

        # Build CSR
        csr_builder = x509.CertificateSigningRequestBuilder().subject_name(
            x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, self.domains[0])])
        )
        if len(self.domains) > 1:
            san = x509.SubjectAlternativeName(
                [x509.DNSName(d) for d in self.domains]
            )
            csr_builder = csr_builder.add_extension(san, critical=False)

        csr = csr_builder.sign(private_key, hashes.SHA256())

        # Finalize order
        deadline = datetime.now(timezone.utc).timestamp() + 300  # 5 min timeout
        order = self._client.finalize_order(
            self._order,
            deadline,
            csr.public_bytes(serialization.Encoding.DER),
        )

        # Get certificate
        cert_pem = order.fullchain_pem.encode()

        # Select preferred chain if specified
        if self._preferred_chain and hasattr(order, "alternative_fullchains_pem"):
            for alt_chain in order.alternative_fullchains_pem:
                if self._preferred_chain.lower() in alt_chain.lower():
                    cert_pem = alt_chain.encode()
                    break

        key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        logger.info(f"Certificate issued for {self.domains}")
        return cert_pem, key_pem

    def _generate_key(self):
        """Generate a private key based on the requested key type."""
        match self._key_type:
            case "ec256":
                return ec.generate_private_key(ec.SECP256R1())
            case "ec384":
                return ec.generate_private_key(ec.SECP384R1())
            case "rsa2048":
                return rsa.generate_private_key(65537, 2048)
            case "rsa4096":
                return rsa.generate_private_key(65537, 4096)
            case _:
                return ec.generate_private_key(ec.SECP256R1())
