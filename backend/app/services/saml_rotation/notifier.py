"""Notification templates for SAML certificate rotation events.

Reuses the existing notification senders (email, Teams, Slack, webhook)
with rotation-specific message content.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.services.notification.email_sender import send_expiration_email
from app.services.notification.teams_sender import send_teams_alert
from app.services.notification.slack_sender import send_slack_alert
from app.services.saml_rotation.graph_operations import get_federation_metadata_url

logger = logging.getLogger(__name__)


def _build_rotation_summary(rotation_job: dict, event: str) -> dict:
    """Build a synthetic item that fits the existing notification senders."""
    grace_days = settings.saml_activation_grace_days
    notified_at = rotation_job.get("notifiedAt") or rotation_job.get("stagedAt")
    if notified_at:
        try:
            dt = datetime.fromisoformat(notified_at)
            deadline = dt + timedelta(days=grace_days)
            deadline_str = deadline.strftime("%Y-%m-%d %H:%M UTC")
        except (ValueError, TypeError):
            deadline_str = f"{grace_days} days after notification"
    else:
        deadline_str = f"{grace_days} days after notification"

    return {
        "id": rotation_job.get("id", ""),
        "itemType": "saml_rotation",
        "source": "enterprise_app",
        "appDisplayName": rotation_job.get("appDisplayName", "Unknown App"),
        "servicePrincipalId": rotation_job.get("servicePrincipalId", ""),
        "expirationStatus": "critical",
        "daysUntilExpiration": None,
        "event": event,
        "oldThumbprint": rotation_job.get("oldThumbprint", ""),
        "newThumbprint": rotation_job.get("newThumbprint", ""),
        "newCertExpiresOn": rotation_job.get("newCertExpiresOn", ""),
        "activationDeadline": deadline_str,
        "state": rotation_job.get("state", ""),
    }


async def notify_cert_staged(
    rotation_job: dict,
    notification_settings: dict,
) -> None:
    """Send notification that a new SAML signing cert has been staged.

    Includes federation metadata URL so SP owners can update their trust.
    """
    app_name = rotation_job.get("appDisplayName", "Unknown App")
    app_id = rotation_job.get("appId", "")
    metadata_url = await get_federation_metadata_url(
        settings.azure_tenant_id, app_id
    )

    summary_item = _build_rotation_summary(rotation_job, "cert_staged")
    summary_item["metadataUrl"] = metadata_url

    logger.info(
        f"Sending SAML rotation staged notification for '{app_name}' "
        f"(new thumbprint: {rotation_job.get('newThumbprint', '')})"
    )

    # Use existing senders -- package rotation info as "critical" items
    # so the notification engine treats them with appropriate urgency
    critical_items = [summary_item]

    if notification_settings.get("emailEnabled"):
        recipients = notification_settings.get("emailRecipients", [])
        email_from = notification_settings.get("emailFrom", "")
        if recipients and email_from:
            try:
                await send_expiration_email(
                    expired=[],
                    critical=critical_items,
                    recipients=recipients,
                    from_address=email_from,
                )
            except Exception as e:
                logger.exception(f"Failed to send rotation email: {e}")

    if notification_settings.get("teamsEnabled"):
        webhook_url = notification_settings.get("teamsWebhookUrl", "")
        if webhook_url:
            try:
                await send_teams_alert(
                    expired=[],
                    critical=critical_items,
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.exception(f"Failed to send rotation Teams alert: {e}")

    if notification_settings.get("slackEnabled"):
        webhook_url = notification_settings.get("slackWebhookUrl", "")
        if webhook_url:
            try:
                await send_slack_alert(
                    expired=[],
                    critical=critical_items,
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.exception(f"Failed to send rotation Slack alert: {e}")


async def notify_cert_activated(
    rotation_job: dict,
    notification_settings: dict,
) -> None:
    """Send notification that the new cert is now the active signing cert."""
    app_name = rotation_job.get("appDisplayName", "Unknown App")
    logger.info(f"Sending SAML rotation activated notification for '{app_name}'")

    summary_item = _build_rotation_summary(rotation_job, "cert_activated")
    expired_items = [summary_item]

    if notification_settings.get("emailEnabled"):
        recipients = notification_settings.get("emailRecipients", [])
        email_from = notification_settings.get("emailFrom", "")
        if recipients and email_from:
            try:
                await send_expiration_email(
                    expired=expired_items,
                    critical=[],
                    recipients=recipients,
                    from_address=email_from,
                )
            except Exception as e:
                logger.exception(f"Failed to send activation email: {e}")

    if notification_settings.get("teamsEnabled"):
        webhook_url = notification_settings.get("teamsWebhookUrl", "")
        if webhook_url:
            try:
                await send_teams_alert(
                    expired=expired_items,
                    critical=[],
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.exception(f"Failed to send activation Teams alert: {e}")


async def notify_rotation_failed(
    rotation_job: dict,
    error: str,
    notification_settings: dict,
) -> None:
    """Send notification that a rotation has failed and needs manual intervention."""
    app_name = rotation_job.get("appDisplayName", "Unknown App")
    logger.info(f"Sending SAML rotation failure notification for '{app_name}'")

    summary_item = _build_rotation_summary(rotation_job, "rotation_failed")
    summary_item["failureReason"] = error

    if notification_settings.get("emailEnabled"):
        recipients = notification_settings.get("emailRecipients", [])
        email_from = notification_settings.get("emailFrom", "")
        if recipients and email_from:
            try:
                await send_expiration_email(
                    expired=[summary_item],
                    critical=[],
                    recipients=recipients,
                    from_address=email_from,
                )
            except Exception as e:
                logger.exception(f"Failed to send failure email: {e}")

    if notification_settings.get("teamsEnabled"):
        webhook_url = notification_settings.get("teamsWebhookUrl", "")
        if webhook_url:
            try:
                await send_teams_alert(
                    expired=[summary_item],
                    critical=[],
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.exception(f"Failed to send failure Teams alert: {e}")
