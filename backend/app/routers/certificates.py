"""ACME certificate management API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models.user import UserInfo
from app.services.acme.orchestrator import CertificateOrchestrator
from app.services.audit import record_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/certificates", tags=["certificates"])


class IssueCertificateRequest(BaseModel):
    domains: list[str]
    certificate_name: str
    key_type: str = "ec256"
    dns_provider: str | None = None
    preferred_chain: str | None = None
    tags: dict[str, str] | None = None


class RenewCertificateRequest(BaseModel):
    certificate_name: str
    domains: list[str] | None = None
    key_type: str = "ec256"
    dns_provider: str | None = None
    force: bool = False


class RevokeCertificateRequest(BaseModel):
    certificate_name: str
    reason: int = 0  # RFC 5280 reason code


@router.post("/issue")
async def issue_certificate(
    request: IssueCertificateRequest,
    user: UserInfo = Depends(require_permission(Permission.ISSUE_CERTIFICATE)),
):
    """Issue a new certificate via ACME."""
    try:
        orchestrator = CertificateOrchestrator()
        result = await orchestrator.issue_certificate(
            domains=request.domains,
            cert_name=request.certificate_name,
            key_type=request.key_type,
            dns_provider_key=request.dns_provider,
            preferred_chain=request.preferred_chain,
            tags=request.tags,
        )
        await record_audit_event("certificate.issue", user, "certificate", request.certificate_name, request.certificate_name, {"domains": request.domains, "key_type": request.key_type})
        return {"status": "issued", "certificate": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate issuance failed: {e}")
        raise HTTPException(status_code=500, detail=f"Issuance failed: {e}")


@router.post("/renew")
async def renew_certificate(
    request: RenewCertificateRequest,
    user: UserInfo = Depends(require_permission(Permission.RENEW_CERTIFICATE)),
):
    """Renew an existing certificate."""
    try:
        orchestrator = CertificateOrchestrator()
        result = await orchestrator.renew_certificate(
            cert_name=request.certificate_name,
            domains=request.domains,
            key_type=request.key_type,
            dns_provider_key=request.dns_provider,
            force=request.force,
        )
        await record_audit_event("certificate.renew", user, "certificate", request.certificate_name, request.certificate_name, {"force": request.force})
        if result is None:
            return {"status": "not_due", "message": "Certificate renewal not yet required"}
        return {"status": "renewed", "certificate": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate renewal failed: {e}")
        raise HTTPException(status_code=500, detail=f"Renewal failed: {e}")


@router.post("/revoke")
async def revoke_certificate(
    request: RevokeCertificateRequest,
    user: UserInfo = Depends(require_permission(Permission.REVOKE_CERTIFICATE)),
):
    """Revoke a certificate."""
    try:
        orchestrator = CertificateOrchestrator()
        result = await orchestrator.revoke_certificate(
            cert_name=request.certificate_name,
            reason=request.reason,
        )
        await record_audit_event("certificate.revoke", user, "certificate", request.certificate_name, request.certificate_name, {"reason": request.reason})
        return {"status": "revoked", "details": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate revocation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Revocation failed: {e}")


@router.post("/check-renewals")
async def check_renewals(
    user: UserInfo = Depends(require_permission(Permission.RENEW_CERTIFICATE)),
):
    """Check all managed certificates and renew those that are due."""
    try:
        orchestrator = CertificateOrchestrator()
        results = await orchestrator.check_renewals()
        await record_audit_event("certificate.check_renewals", user, "certificate", "", "bulk-renewal-check", {"renewed": len([r for r in results if "error" not in r]), "errors": len([r for r in results if "error" in r])})
        return {
            "status": "completed",
            "renewed": len([r for r in results if "error" not in r]),
            "errors": len([r for r in results if "error" in r]),
            "details": results,
        }
    except Exception as e:
        logger.error(f"Renewal check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Renewal check failed: {e}")
