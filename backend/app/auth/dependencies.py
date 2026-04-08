import logging

from fastapi import Depends, HTTPException, Request

from app.auth.msal_validator import validate_token
from app.auth.rbac import Role, Permission, ADMIN_PERMISSIONS, VIEWER_PERMISSIONS
from app.models.user import UserInfo

logger = logging.getLogger(__name__)


def _extract_bearer_token(request: Request) -> str:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return auth_header[7:]


async def get_current_user(request: Request) -> UserInfo:
    """Validate the access token and return user info."""
    token = _extract_bearer_token(request)

    try:
        claims = await validate_token(token)
    except Exception as e:
        logger.warning(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return UserInfo(
        oid=claims.get("oid", ""),
        name=claims.get("name", ""),
        email=claims.get("preferred_username", ""),
        roles=claims.get("roles", ["Viewer"]),
    )


def _user_has_permission(user: UserInfo, permission: Permission) -> bool:
    """Check if user has a specific permission via roles or direct app role assignment."""
    if Role.ADMIN in user.roles:
        return True
    if permission.value in user.roles:
        return True
    if Role.VIEWER in user.roles and permission in VIEWER_PERMISSIONS:
        return True
    return False


async def require_admin(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if Role.ADMIN not in user.roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


async def require_viewer(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    return user


def require_permission(permission: Permission):
    """Factory for permission-checking dependencies."""
    async def _check(user: UserInfo = Depends(get_current_user)) -> UserInfo:
        if not _user_has_permission(user, permission):
            raise HTTPException(status_code=403, detail=f"Permission '{permission.value}' required")
        return user
    return _check
