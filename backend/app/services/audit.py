"""Audit log service for recording administrative actions."""

import logging
import uuid
from datetime import datetime, timezone

from app.models.audit import AuditLogEntry
from app.models.user import UserInfo

logger = logging.getLogger(__name__)


async def record_audit_event(
    action: str,
    user: UserInfo,
    resource_type: str = "",
    resource_id: str = "",
    resource_name: str = "",
    details: dict | None = None,
) -> AuditLogEntry:
    """Record an audit event to the audit log container."""
    entry = AuditLogEntry(
        id=str(uuid.uuid4()),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        user_id=user.oid,
        user_name=user.name,
        user_email=user.email,
        timestamp=datetime.now(timezone.utc).isoformat(),
        details=details or {},
    )

    try:
        from app.db.cosmos_client import get_audit_log_container
        container = get_audit_log_container()
        await container.upsert_item(body=entry.to_cosmos_doc())
        logger.info(f"Audit: {action} by {user.name or user.oid} on {resource_type}/{resource_id}")
    except Exception as e:
        # Audit logging should never break the main flow
        logger.exception(f"Failed to record audit event: {e}")

    return entry
