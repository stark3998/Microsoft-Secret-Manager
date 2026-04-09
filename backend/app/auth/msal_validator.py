import logging
import time
from typing import Any

import httpx
from jose import jwt, JWTError

from app.config import settings

logger = logging.getLogger(__name__)

_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def _get_signing_keys() -> dict[str, Any]:
    """Fetch and cache JWKS from Entra ID."""
    global _jwks_cache, _jwks_cache_time

    if _jwks_cache and (time.time() - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    async with httpx.AsyncClient() as client:
        response = await client.get(settings.msal_jwks_uri)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = time.time()
        logger.info("Refreshed JWKS signing keys from Entra ID")

    return _jwks_cache


async def validate_token(token: str) -> dict[str, Any]:
    """Validate a JWT access token or ID token from MSAL and return claims.

    Accepts both:
    - Access tokens with audience = api://{client_id} (when API scope is configured)
    - ID tokens with audience = {client_id} (basic SPA auth)
    """
    jwks = await _get_signing_keys()

    # Decode the header to find the signing key
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    rsa_key = None
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            rsa_key = key
            break

    if rsa_key is None:
        raise ValueError("Unable to find matching signing key in JWKS")

    client_id = settings.msal_client_id or settings.azure_client_id

    # Accept both access tokens (api://{id}) and ID tokens ({id}) as valid audiences
    valid_audiences = [client_id, f"api://{client_id}"]

    # Try validation with each audience
    last_error = None
    for audience in valid_audiences:
        try:
            claims = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=audience,
                issuer=settings.msal_issuer,
                options={"verify_at_hash": False},
            )
            return claims
        except JWTError as e:
            last_error = e
            continue

    # If strict audience validation fails, try with v1 issuer format
    v1_issuer = f"https://sts.windows.net/{settings.azure_tenant_id}/"
    for audience in valid_audiences:
        try:
            claims = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=audience,
                issuer=v1_issuer,
                options={"verify_at_hash": False},
            )
            return claims
        except JWTError as e:
            last_error = e
            continue

    raise last_error or ValueError("Token validation failed")
