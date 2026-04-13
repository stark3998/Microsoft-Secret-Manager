"""DNS zone management API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models.user import UserInfo
from app.services.dns_providers.registry import get_available_providers, get_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dns", tags=["dns"])


@router.get("/providers")
async def list_providers(
    user: UserInfo = Depends(require_permission(Permission.MANAGE_DNS)),
):
    """List all configured DNS providers."""
    providers = get_available_providers()
    return {
        "providers": [
            {"key": key, "name": provider.name}
            for key, provider in providers.items()
        ]
    }


@router.get("/zones")
async def list_all_zones(
    user: UserInfo = Depends(require_permission(Permission.MANAGE_DNS)),
):
    """List DNS zones across all configured providers."""
    providers = get_available_providers()
    result = []
    for key, provider in providers.items():
        try:
            zones = await provider.list_zones()
            for zone in zones:
                result.append({
                    "zone": zone,
                    "provider": key,
                    "provider_name": provider.name,
                })
        except Exception as e:
            logger.exception(f"Failed to list zones from {provider.name}: {e}")
            result.append({
                "zone": None,
                "provider": key,
                "provider_name": provider.name,
                "error": str(e),
            })
    return {"zones": result}


@router.get("/zones/{provider_key}")
async def list_zones_for_provider(
    provider_key: str,
    user: UserInfo = Depends(require_permission(Permission.MANAGE_DNS)),
):
    """List DNS zones for a specific provider."""
    try:
        provider = get_provider(provider_key)
        zones = await provider.list_zones()
        return {
            "provider": provider_key,
            "provider_name": provider.name,
            "zones": zones,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Failed to list zones from {provider_key}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
