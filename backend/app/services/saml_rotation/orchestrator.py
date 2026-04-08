"""SAML certificate rotation orchestrator.

Implements a state-machine-based lifecycle for rotating SAML signing
certificates on Entra ID enterprise apps via Microsoft Graph API.

States: staged -> notified -> activated -> completed
        (any) -> cancelled | failed
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta

from app.config import settings
from app.db.cosmos_client import get_items_container, get_settings_container
from app.db.queries import query_items, upsert_item
from app.models.saml_rotation import RotationState, SamlRotationJob
from app.services.saml_rotation.graph_operations import (
    add_token_signing_certificate,
    activate_signing_certificate,
    remove_certificate,
    get_service_principal_certificates,
)
from app.services.saml_rotation.notifier import (
    notify_cert_staged,
    notify_cert_activated,
    notify_rotation_failed,
)

logger = logging.getLogger(__name__)


class SamlRotationOrchestrator:
    """Orchestrates the SAML certificate rotation lifecycle."""

    async def run_rotation_cycle(self) -> dict:
        """Main scheduler entry point. Processes all rotation states in sequence.

        Returns summary of actions taken.
        """
        summary = {
            "initiated": 0,
            "notified": 0,
            "activated": 0,
            "completed": 0,
            "errors": 0,
        }

        try:
            initiated = await self.evaluate_and_initiate_rotations()
            summary["initiated"] = len(initiated)
        except Exception as e:
            logger.error(f"Error during rotation evaluation: {e}")
            summary["errors"] += 1

        try:
            notified = await self.process_staged_rotations()
            summary["notified"] = len(notified)
        except Exception as e:
            logger.error(f"Error processing staged rotations: {e}")
            summary["errors"] += 1

        try:
            activated = await self.process_notified_rotations()
            summary["activated"] = len(activated)
        except Exception as e:
            logger.error(f"Error processing notified rotations: {e}")
            summary["errors"] += 1

        try:
            completed = await self.process_activated_rotations()
            summary["completed"] = len(completed)
        except Exception as e:
            logger.error(f"Error processing activated rotations: {e}")
            summary["errors"] += 1

        logger.info(f"SAML rotation cycle complete: {summary}")
        return summary

    async def evaluate_and_initiate_rotations(self) -> list[dict]:
        """Find enterprise apps with expiring SAML certs and initiate rotations.

        Queries the items container for SAML certs approaching expiration,
        checks for existing active rotation jobs, and initiates new ones.
        """
        container = get_items_container()
        trigger_days = settings.saml_rotation_trigger_days

        # Find SAML certs approaching expiration
        expiring = await query_items(
            container,
            "SELECT * FROM c WHERE c.itemType = 'saml_certificate' "
            "AND c.source = 'enterprise_app' "
            "AND c.daysUntilExpiration != null "
            "AND c.daysUntilExpiration <= @triggerDays "
            "AND c.daysUntilExpiration > 0",
            [{"name": "@triggerDays", "value": trigger_days}],
            partition_key="entra",
        )

        if not expiring:
            logger.info("No SAML certificates approaching expiration")
            return []

        # Load rotation settings for exclusion list
        rotation_settings = await self._get_rotation_settings()
        excluded = set(rotation_settings.get("excludedServicePrincipals", []))

        # Get active rotation jobs to avoid duplicates
        active_jobs = await self._get_active_rotation_sp_ids()

        results = []
        for cert in expiring:
            sp_id = cert.get("servicePrincipalId", "")
            if sp_id in excluded:
                logger.info(f"Skipping excluded SP {sp_id}")
                continue
            if sp_id in active_jobs:
                logger.info(f"Skipping SP {sp_id} — active rotation exists")
                continue

            try:
                result = await self.initiate_rotation(
                    service_principal_id=sp_id,
                    app_id=cert.get("appId", ""),
                    app_display_name=cert.get("appDisplayName", ""),
                    old_thumbprint=cert.get("thumbprint", ""),
                    old_key_id=cert.get("credentialId", ""),
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to initiate rotation for SP {sp_id}: {e}")

        return results

    async def initiate_rotation(
        self,
        service_principal_id: str,
        app_id: str = "",
        app_display_name: str = "",
        old_thumbprint: str = "",
        old_key_id: str = "",
        triggered_by: str = "system",
    ) -> dict:
        """Start a new rotation for a specific service principal.

        Generates a new signing cert via Graph API and creates a rotation
        job document in Cosmos.
        """
        # Check for existing active rotation
        active_sps = await self._get_active_rotation_sp_ids()
        if service_principal_id in active_sps:
            raise ValueError(
                f"Active rotation already exists for SP {service_principal_id}"
            )

        now = datetime.now(timezone.utc)

        # If old_thumbprint not provided, look it up
        if not old_thumbprint:
            sp_data = await get_service_principal_certificates(service_principal_id)
            old_thumbprint = sp_data.get("preferredTokenSigningKeyThumbprint", "")
            if not app_id:
                app_id = sp_data.get("appId", "")
            if not app_display_name:
                app_display_name = sp_data.get("displayName", "")

        # Generate new certificate via Graph API
        cert_result = await add_token_signing_certificate(
            service_principal_id=service_principal_id,
            display_name=f"Auto-rotated {now.strftime('%Y-%m-%d')}",
            validity_years=settings.saml_new_cert_validity_years,
        )

        new_thumbprint = cert_result.get("thumbprint", "")
        new_key_id = cert_result.get("keyId", "")
        new_expires = cert_result.get("endDateTime", "")

        # Parse expiry
        new_cert_expires_on = None
        if new_expires:
            try:
                new_cert_expires_on = datetime.fromisoformat(
                    new_expires.replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                pass

        # Create rotation job
        job = SamlRotationJob(
            id=f"saml-rotation-{uuid.uuid4().hex[:12]}",
            service_principal_id=service_principal_id,
            app_id=app_id,
            app_display_name=app_display_name,
            state=RotationState.STAGED,
            old_thumbprint=old_thumbprint,
            old_key_id=old_key_id,
            new_thumbprint=new_thumbprint,
            new_key_id=new_key_id,
            new_cert_expires_on=new_cert_expires_on,
            initiated_at=now,
            initiated_by=triggered_by,
            staged_at=now,
            history=[
                {
                    "action": "staged",
                    "at": now.isoformat(),
                    "by": triggered_by,
                    "details": f"New cert thumbprint: {new_thumbprint}",
                }
            ],
        )

        container = get_items_container()
        doc = job.to_cosmos_doc()
        await upsert_item(container, doc)

        logger.info(
            f"Initiated SAML rotation for '{app_display_name}' "
            f"(SP: {service_principal_id}, new thumbprint: {new_thumbprint})"
        )
        return doc

    async def process_staged_rotations(self) -> list[dict]:
        """Process rotations in 'staged' state: send notifications after delay."""
        container = get_items_container()
        now = datetime.now(timezone.utc)
        delay_hours = settings.saml_notification_delay_hours

        staged = await query_items(
            container,
            "SELECT * FROM c WHERE c.itemType = 'saml_rotation_job' "
            "AND c.state = 'staged'",
            partition_key="saml_rotation",
        )

        notification_settings = await self._get_notification_settings()
        results = []

        for job in staged:
            staged_at = job.get("stagedAt")
            if not staged_at:
                continue

            staged_dt = datetime.fromisoformat(staged_at)
            if now < staged_dt + timedelta(hours=delay_hours):
                continue

            try:
                await notify_cert_staged(job, notification_settings)

                job["state"] = RotationState.NOTIFIED
                job["notifiedAt"] = now.isoformat()
                job["history"].append({
                    "action": "notified",
                    "at": now.isoformat(),
                    "by": "system",
                })
                await upsert_item(container, job)
                results.append(job)

                logger.info(
                    f"Sent rotation notification for '{job.get('appDisplayName')}'"
                )
            except Exception as e:
                logger.error(
                    f"Failed to notify for rotation {job['id']}: {e}"
                )
                await self._mark_failed(job, str(e))

        return results

    async def process_notified_rotations(self) -> list[dict]:
        """Process rotations in 'notified' state: activate after grace period."""
        if not settings.saml_auto_activate:
            logger.info("Auto-activate disabled — skipping notified rotations")
            return []

        container = get_items_container()
        now = datetime.now(timezone.utc)
        grace_days = settings.saml_activation_grace_days

        notified = await query_items(
            container,
            "SELECT * FROM c WHERE c.itemType = 'saml_rotation_job' "
            "AND c.state = 'notified'",
            partition_key="saml_rotation",
        )

        notification_settings = await self._get_notification_settings()
        results = []

        for job in notified:
            notified_at = job.get("notifiedAt")
            if not notified_at:
                continue

            notified_dt = datetime.fromisoformat(notified_at)
            if now < notified_dt + timedelta(days=grace_days):
                continue

            try:
                await activate_signing_certificate(
                    service_principal_id=job["servicePrincipalId"],
                    thumbprint=job["newThumbprint"],
                )

                job["state"] = RotationState.ACTIVATED
                job["activatedAt"] = now.isoformat()
                job["history"].append({
                    "action": "activated",
                    "at": now.isoformat(),
                    "by": "system",
                    "details": "Auto-activated after grace period",
                })
                await upsert_item(container, job)

                await notify_cert_activated(job, notification_settings)
                results.append(job)

                logger.info(
                    f"Auto-activated rotation for '{job.get('appDisplayName')}'"
                )
            except Exception as e:
                logger.error(
                    f"Failed to activate rotation {job['id']}: {e}"
                )
                await self._mark_failed(job, str(e))
                await notify_rotation_failed(job, str(e), notification_settings)

        return results

    async def process_activated_rotations(self) -> list[dict]:
        """Process rotations in 'activated' state: remove old cert after grace."""
        container = get_items_container()
        now = datetime.now(timezone.utc)
        cleanup_days = settings.saml_cleanup_grace_days

        activated = await query_items(
            container,
            "SELECT * FROM c WHERE c.itemType = 'saml_rotation_job' "
            "AND c.state = 'activated'",
            partition_key="saml_rotation",
        )

        results = []

        for job in activated:
            activated_at = job.get("activatedAt")
            if not activated_at:
                continue

            activated_dt = datetime.fromisoformat(activated_at)
            if now < activated_dt + timedelta(days=cleanup_days):
                continue

            try:
                old_key_id = job.get("oldKeyId")
                if old_key_id:
                    await remove_certificate(
                        service_principal_id=job["servicePrincipalId"],
                        key_id=old_key_id,
                    )

                job["state"] = RotationState.COMPLETED
                job["completedAt"] = now.isoformat()
                job["history"].append({
                    "action": "completed",
                    "at": now.isoformat(),
                    "by": "system",
                    "details": "Old certificate removed",
                })
                await upsert_item(container, job)
                results.append(job)

                logger.info(
                    f"Completed rotation for '{job.get('appDisplayName')}' "
                    f"— old cert removed"
                )
            except Exception as e:
                logger.error(
                    f"Failed cleanup for rotation {job['id']}: {e}"
                )
                await self._mark_failed(job, str(e))

        return results

    async def manually_activate(
        self,
        rotation_id: str,
        activated_by: str,
    ) -> dict:
        """Manually activate a staged or notified rotation (admin action)."""
        container = get_items_container()
        now = datetime.now(timezone.utc)

        jobs = await query_items(
            container,
            "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'saml_rotation_job'",
            [{"name": "@id", "value": rotation_id}],
            partition_key="saml_rotation",
        )
        if not jobs:
            raise ValueError(f"Rotation job '{rotation_id}' not found")

        job = jobs[0]
        if job["state"] not in (RotationState.STAGED, RotationState.NOTIFIED):
            raise ValueError(
                f"Cannot activate rotation in state '{job['state']}'"
            )

        await activate_signing_certificate(
            service_principal_id=job["servicePrincipalId"],
            thumbprint=job["newThumbprint"],
        )

        job["state"] = RotationState.ACTIVATED
        job["activatedAt"] = now.isoformat()
        job["history"].append({
            "action": "activated",
            "at": now.isoformat(),
            "by": activated_by,
            "details": "Manually activated by admin",
        })
        await upsert_item(container, job)

        notification_settings = await self._get_notification_settings()
        await notify_cert_activated(job, notification_settings)

        logger.info(
            f"Manually activated rotation {rotation_id} by {activated_by}"
        )
        return job

    async def cancel_rotation(
        self,
        rotation_id: str,
        cancelled_by: str,
    ) -> dict:
        """Cancel an in-progress rotation."""
        container = get_items_container()
        now = datetime.now(timezone.utc)

        jobs = await query_items(
            container,
            "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'saml_rotation_job'",
            [{"name": "@id", "value": rotation_id}],
            partition_key="saml_rotation",
        )
        if not jobs:
            raise ValueError(f"Rotation job '{rotation_id}' not found")

        job = jobs[0]
        terminal_states = {RotationState.COMPLETED, RotationState.CANCELLED, RotationState.FAILED}
        if job["state"] in terminal_states:
            raise ValueError(
                f"Cannot cancel rotation in state '{job['state']}'"
            )

        # If not yet activated, try to remove the staged cert
        if job["state"] in (RotationState.STAGED, RotationState.NOTIFIED):
            new_key_id = job.get("newKeyId")
            if new_key_id:
                try:
                    await remove_certificate(
                        service_principal_id=job["servicePrincipalId"],
                        key_id=new_key_id,
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to remove staged cert during cancellation: {e}"
                    )

        job["state"] = RotationState.CANCELLED
        job["cancelledAt"] = now.isoformat()
        job["cancelledBy"] = cancelled_by
        job["history"].append({
            "action": "cancelled",
            "at": now.isoformat(),
            "by": cancelled_by,
        })
        await upsert_item(container, job)

        logger.info(f"Cancelled rotation {rotation_id} by {cancelled_by}")
        return job

    async def get_rotation(self, rotation_id: str) -> dict | None:
        """Get a single rotation job by ID."""
        container = get_items_container()
        jobs = await query_items(
            container,
            "SELECT * FROM c WHERE c.id = @id AND c.itemType = 'saml_rotation_job'",
            [{"name": "@id", "value": rotation_id}],
            partition_key="saml_rotation",
        )
        return jobs[0] if jobs else None

    async def list_rotations(
        self,
        state: str | None = None,
        service_principal_id: str | None = None,
    ) -> list[dict]:
        """List rotation jobs with optional filters."""
        container = get_items_container()
        query = "SELECT * FROM c WHERE c.itemType = 'saml_rotation_job'"
        params = []

        if state:
            query += " AND c.state = @state"
            params.append({"name": "@state", "value": state})
        if service_principal_id:
            query += " AND c.servicePrincipalId = @spId"
            params.append({"name": "@spId", "value": service_principal_id})

        query += " ORDER BY c.initiatedAt DESC"

        return await query_items(
            container, query, params or None, partition_key="saml_rotation"
        )

    async def get_eligible_apps(self) -> list[dict]:
        """List enterprise apps eligible for rotation (approaching expiry, no active job)."""
        container = get_items_container()
        trigger_days = settings.saml_rotation_trigger_days

        expiring = await query_items(
            container,
            "SELECT * FROM c WHERE c.itemType = 'saml_certificate' "
            "AND c.source = 'enterprise_app' "
            "AND c.daysUntilExpiration != null "
            "AND c.daysUntilExpiration <= @triggerDays "
            "AND c.daysUntilExpiration > 0",
            [{"name": "@triggerDays", "value": trigger_days}],
            partition_key="entra",
        )

        active_sps = await self._get_active_rotation_sp_ids()
        rotation_settings = await self._get_rotation_settings()
        excluded = set(rotation_settings.get("excludedServicePrincipals", []))

        results = []
        for cert in expiring:
            sp_id = cert.get("servicePrincipalId", "")
            results.append({
                "servicePrincipalId": sp_id,
                "appId": cert.get("appId", ""),
                "appDisplayName": cert.get("appDisplayName", ""),
                "currentThumbprint": cert.get("thumbprint", ""),
                "expiresOn": cert.get("expiresOn", ""),
                "daysUntilExpiration": cert.get("daysUntilExpiration"),
                "hasActiveRotation": sp_id in active_sps,
                "isExcluded": sp_id in excluded,
            })

        return results

    # --- Private helpers ---

    async def _get_active_rotation_sp_ids(self) -> set[str]:
        """Get SP IDs that have an active (non-terminal) rotation job."""
        container = get_items_container()
        active = await query_items(
            container,
            "SELECT c.servicePrincipalId FROM c "
            "WHERE c.itemType = 'saml_rotation_job' "
            "AND c.state IN ('staged', 'notified', 'activated')",
            partition_key="saml_rotation",
        )
        return {j["servicePrincipalId"] for j in active}

    async def _get_notification_settings(self) -> dict:
        """Load notification settings from Cosmos."""
        container = get_settings_container()
        results = await query_items(
            container,
            "SELECT * FROM c WHERE c.id = 'notifications'",
        )
        return results[0] if results else {}

    async def _get_rotation_settings(self) -> dict:
        """Load SAML rotation settings from Cosmos."""
        container = get_settings_container()
        results = await query_items(
            container,
            "SELECT * FROM c WHERE c.id = 'saml_rotation'",
        )
        return results[0] if results else {}

    async def _mark_failed(self, job: dict, reason: str) -> None:
        """Mark a rotation job as failed."""
        container = get_items_container()
        now = datetime.now(timezone.utc)
        job["state"] = RotationState.FAILED
        job["failedAt"] = now.isoformat()
        job["failureReason"] = reason
        job["history"].append({
            "action": "failed",
            "at": now.isoformat(),
            "by": "system",
            "details": reason,
        })
        await upsert_item(container, job)
