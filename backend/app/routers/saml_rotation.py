"""SAML certificate auto-rotation API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models.user import UserInfo
from app.services.saml_rotation.orchestrator import SamlRotationOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/saml-rotation", tags=["saml-rotation"])


class InitiateRotationRequest(BaseModel):
    service_principal_id: str
    app_display_name: str = ""


class ActivateRotationRequest(BaseModel):
    rotation_id: str


class CancelRotationRequest(BaseModel):
    rotation_id: str


@router.get("")
async def list_rotations(
    status: str | None = Query(None),
    sp_id: str | None = Query(None),
    user: UserInfo = Depends(get_current_user),
):
    """List all rotation jobs with optional filters."""
    orchestrator = SamlRotationOrchestrator()
    return await orchestrator.list_rotations(state=status, service_principal_id=sp_id)


@router.get("/eligible")
async def list_eligible_apps(
    user: UserInfo = Depends(get_current_user),
):
    """List enterprise apps eligible for SAML cert rotation."""
    orchestrator = SamlRotationOrchestrator()
    return await orchestrator.get_eligible_apps()


@router.get("/{rotation_id}")
async def get_rotation(
    rotation_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Get details of a single rotation job."""
    orchestrator = SamlRotationOrchestrator()
    job = await orchestrator.get_rotation(rotation_id)
    if not job:
        raise HTTPException(status_code=404, detail="Rotation job not found")
    return job


@router.post("/initiate")
async def initiate_rotation(
    request: InitiateRotationRequest,
    user: UserInfo = Depends(require_permission(Permission.ROTATE_SAML_CERTIFICATE)),
):
    """Manually initiate a SAML cert rotation for a specific service principal."""
    try:
        orchestrator = SamlRotationOrchestrator()
        result = await orchestrator.initiate_rotation(
            service_principal_id=request.service_principal_id,
            app_display_name=request.app_display_name,
            triggered_by=user.email,
        )
        return {"status": "staged", "rotation": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Rotation initiation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initiation failed: {e}")


@router.post("/activate")
async def activate_rotation(
    request: ActivateRotationRequest,
    user: UserInfo = Depends(require_permission(Permission.ROTATE_SAML_CERTIFICATE)),
):
    """Manually activate a staged or notified rotation."""
    try:
        orchestrator = SamlRotationOrchestrator()
        result = await orchestrator.manually_activate(
            rotation_id=request.rotation_id,
            activated_by=user.email,
        )
        return {"status": "activated", "rotation": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Rotation activation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Activation failed: {e}")


@router.post("/cancel")
async def cancel_rotation(
    request: CancelRotationRequest,
    user: UserInfo = Depends(require_permission(Permission.ROTATE_SAML_CERTIFICATE)),
):
    """Cancel an in-progress rotation."""
    try:
        orchestrator = SamlRotationOrchestrator()
        result = await orchestrator.cancel_rotation(
            rotation_id=request.rotation_id,
            cancelled_by=user.email,
        )
        return {"status": "cancelled", "rotation": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Rotation cancellation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cancellation failed: {e}")


@router.post("/run-cycle")
async def run_rotation_cycle(
    user: UserInfo = Depends(require_permission(Permission.ROTATE_SAML_CERTIFICATE)),
):
    """Manually trigger a full rotation cycle (evaluate + process all states)."""
    try:
        orchestrator = SamlRotationOrchestrator()
        result = await orchestrator.run_rotation_cycle()
        return {"status": "completed", "summary": result}
    except Exception as e:
        logger.error(f"Rotation cycle failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rotation cycle failed: {e}")
