"""Key Vault integration for storing ACME-issued certificates and account keys."""

import base64
import logging

from azure.keyvault.certificates import (
    CertificateClient,
    CertificatePolicy,
    CertificateContentType,
    KeyType as KvKeyType,
    KeySize,
)
from azure.keyvault.secrets import SecretClient
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12

from app.config import settings
from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)


class KeyVaultCertificateStore:
    """Store and retrieve ACME certificates in Azure Key Vault."""

    def __init__(self, vault_url: str | None = None):
        self._vault_url = vault_url or settings.acme_key_vault_url
        self._cert_client: CertificateClient | None = None
        self._secret_client: SecretClient | None = None

    def _get_cert_client(self) -> CertificateClient:
        if self._cert_client is None:
            self._cert_client = CertificateClient(
                vault_url=self._vault_url,
                credential=get_azure_credential(),
            )
        return self._cert_client

    def _get_secret_client(self) -> SecretClient:
        if self._secret_client is None:
            self._secret_client = SecretClient(
                vault_url=self._vault_url,
                credential=get_azure_credential(),
            )
        return self._secret_client

    async def store_certificate(
        self,
        name: str,
        cert_pem: bytes,
        key_pem: bytes,
        tags: dict[str, str] | None = None,
    ) -> str:
        """Import a certificate (PEM cert + key) into Key Vault.

        Args:
            name: Certificate name in Key Vault.
            cert_pem: PEM-encoded certificate chain.
            key_pem: PEM-encoded private key.
            tags: Optional tags to apply.

        Returns:
            The Key Vault certificate version ID.
        """
        client = self._get_cert_client()

        # Parse cert and key, build PFX
        cert = x509.load_pem_x509_certificate(cert_pem)
        private_key = serialization.load_pem_private_key(key_pem, password=None)

        # Split chain: first cert is the leaf, rest are CA chain
        certs_pem = cert_pem.decode()
        pem_blocks = []
        current = ""
        for line in certs_pem.splitlines(True):
            current += line
            if "END CERTIFICATE" in line:
                pem_blocks.append(current)
                current = ""

        leaf_cert = x509.load_pem_x509_certificate(pem_blocks[0].encode())
        ca_certs = [
            x509.load_pem_x509_certificate(block.encode())
            for block in pem_blocks[1:]
        ] if len(pem_blocks) > 1 else None

        pfx_bytes = pkcs12.serialize_key_and_certificates(
            name=name.encode(),
            key=private_key,
            cert=leaf_cert,
            cas=ca_certs,
            encryption_algorithm=serialization.NoEncryption(),
        )

        # Import PFX into Key Vault
        imported = client.import_certificate(
            certificate_name=name,
            certificate_bytes=pfx_bytes,
            policy=CertificatePolicy(
                content_type=CertificateContentType.pkcs12,
                exportable=True,
            ),
            tags=tags or {},
        )

        logger.info(
            f"Certificate '{name}' stored in Key Vault, "
            f"version: {imported.properties.version}"
        )
        return imported.properties.version

    async def get_certificate_pem(self, name: str) -> bytes | None:
        """Retrieve a certificate's PEM from Key Vault."""
        try:
            client = self._get_secret_client()
            # Key Vault stores the full PFX as a base64 secret
            secret = client.get_secret(name)
            if secret.value:
                pfx_bytes = base64.b64decode(secret.value)
                private_key, cert, chain = pkcs12.load_key_and_certificates(
                    pfx_bytes, None
                )
                return cert.public_bytes(serialization.Encoding.PEM) if cert else None
        except Exception as e:
            logger.warning(f"Failed to retrieve certificate '{name}': {e}")
        return None

    async def store_account_key(self, key_pem: bytes) -> None:
        """Store the ACME account key as a Key Vault secret."""
        client = self._get_secret_client()
        client.set_secret(
            "acme-account-key",
            base64.b64encode(key_pem).decode(),
            tags={"purpose": "ACME account private key"},
        )
        logger.info("ACME account key stored in Key Vault")

    async def get_account_key(self) -> bytes | None:
        """Retrieve the ACME account key from Key Vault."""
        try:
            client = self._get_secret_client()
            secret = client.get_secret("acme-account-key")
            if secret.value:
                return base64.b64decode(secret.value)
        except Exception as e:
            logger.debug(f"No ACME account key in Key Vault: {e}")
        return None

    async def tag_certificate(
        self, name: str, tags: dict[str, str]
    ) -> None:
        """Update tags on a Key Vault certificate."""
        client = self._get_cert_client()
        cert = client.get_certificate(name)
        merged_tags = {**(cert.properties.tags or {}), **tags}
        client.update_certificate_properties(
            name,
            tags=merged_tags,
        )
        logger.info(f"Updated tags on certificate '{name}'")
