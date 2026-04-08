"""Microsoft Graph API operations for SAML certificate management.

Wraps the Graph API calls needed to manage SAML signing certificates
on Entra ID service principals.
"""

import logging
from datetime import datetime, timezone, timedelta

import httpx

from app.utils.azure_credential import get_azure_credential
from app.utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPE = "https://graph.microsoft.com/.default"


async def _get_graph_token() -> str:
    """Acquire a Graph API access token using DefaultAzureCredential."""
    credential = get_azure_credential()
    token = credential.get_token(GRAPH_SCOPE)
    return token.token


async def _graph_request(
    method: str,
    path: str,
    json_body: dict | None = None,
) -> dict | None:
    """Make an authenticated request to the Microsoft Graph API."""
    token = await _get_graph_token()
    url = f"{GRAPH_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method, url, headers=headers, json=json_body
        )
        response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return None
        return response.json()


async def add_token_signing_certificate(
    service_principal_id: str,
    display_name: str = "Auto-rotated SAML signing cert",
    validity_years: int = 3,
) -> dict:
    """Generate a new self-signed SAML signing certificate on a service principal.

    Uses POST /servicePrincipals/{id}/addTokenSigningCertificate.
    The new certificate is created as INACTIVE -- it appears in federation
    metadata but is not used for signing until explicitly activated.

    Args:
        service_principal_id: The SP object ID.
        display_name: Display name for the new certificate.
        validity_years: How many years the new cert should be valid.

    Returns:
        Dict with: thumbprint, customKeyIdentifier, keyId, startDateTime,
        endDateTime, type, usage, key (base64 cert).
    """
    end_date = datetime.now(timezone.utc) + timedelta(days=365 * validity_years)
    body = {
        "displayName": display_name,
        "endDateTime": end_date.isoformat(),
    }

    result = await retry_with_backoff(
        lambda: _graph_request(
            "POST",
            f"/servicePrincipals/{service_principal_id}/addTokenSigningCertificate",
            json_body=body,
        ),
        max_retries=2,
    )
    logger.info(
        f"Added token signing certificate to SP {service_principal_id}, "
        f"thumbprint: {result.get('thumbprint', 'unknown')}"
    )
    return result


async def activate_signing_certificate(
    service_principal_id: str,
    thumbprint: str,
) -> None:
    """Set the active SAML signing certificate for a service principal.

    Uses PATCH /servicePrincipals/{id} to set preferredTokenSigningKeyThumbprint.

    Args:
        service_principal_id: The SP object ID.
        thumbprint: Thumbprint of the certificate to activate.
    """
    body = {"preferredTokenSigningKeyThumbprint": thumbprint}
    await retry_with_backoff(
        lambda: _graph_request(
            "PATCH",
            f"/servicePrincipals/{service_principal_id}",
            json_body=body,
        ),
        max_retries=2,
    )
    logger.info(
        f"Activated signing cert {thumbprint} on SP {service_principal_id}"
    )


async def remove_certificate(
    service_principal_id: str,
    key_id: str,
) -> None:
    """Remove a certificate from a service principal.

    Uses POST /servicePrincipals/{id}/removeKey.

    Args:
        service_principal_id: The SP object ID.
        key_id: The keyId of the certificate to remove.
    """
    body = {"keyId": key_id, "proof": ""}  # proof not needed for app-only calls
    # removeKey may require a proof token in some contexts; for app-only
    # with Application.ReadWrite.All, we use removePassword or direct
    # keyCredentials PATCH as fallback.
    try:
        await retry_with_backoff(
            lambda: _graph_request(
                "POST",
                f"/servicePrincipals/{service_principal_id}/removeKey",
                json_body=body,
            ),
            max_retries=2,
        )
    except httpx.HTTPStatusError:
        # Fallback: read current keyCredentials, filter out the target, and PATCH
        logger.warning(
            f"removeKey failed for SP {service_principal_id}, "
            f"falling back to keyCredentials PATCH"
        )
        sp_data = await get_service_principal_certificates(service_principal_id)
        filtered = [
            cred for cred in sp_data.get("keyCredentials", [])
            if cred.get("keyId") != key_id
        ]
        await _graph_request(
            "PATCH",
            f"/servicePrincipals/{service_principal_id}",
            json_body={"keyCredentials": filtered},
        )

    logger.info(
        f"Removed certificate {key_id} from SP {service_principal_id}"
    )


async def get_service_principal_certificates(
    service_principal_id: str,
) -> dict:
    """Get current certificate state for a service principal.

    Returns dict with keyCredentials list and preferredTokenSigningKeyThumbprint.
    """
    result = await _graph_request(
        "GET",
        f"/servicePrincipals/{service_principal_id}"
        f"?$select=id,appId,displayName,keyCredentials,preferredTokenSigningKeyThumbprint",
    )
    return result or {}


async def get_federation_metadata_url(
    tenant_id: str,
    app_id: str,
) -> str:
    """Build the Entra ID federation metadata URL for a SAML app.

    SPs can fetch this URL to get the current signing certificate(s).
    Both active and inactive certs appear in the metadata XML.
    """
    return (
        f"https://login.microsoftonline.com/{tenant_id}"
        f"/federationmetadata/2007-06/federationmetadata.xml"
        f"?appid={app_id}"
    )
