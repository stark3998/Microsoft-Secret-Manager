import logging

from app.services.notification.email_sender import send_expiration_email
from app.services.notification.teams_sender import send_teams_alert
from app.services.notification.slack_sender import send_slack_alert
from app.services.notification.webhook_sender import send_generic_webhook

logger = logging.getLogger(__name__)


async def evaluate_and_notify(items: list[dict], notification_settings: dict) -> None:
    """Evaluate items for expiration alerts and send notifications."""
    if not notification_settings:
        return

    expired = [i for i in items if i.get("expirationStatus") == "expired"]
    critical = [i for i in items if i.get("expirationStatus") == "critical"]
    warning = [i for i in items if i.get("expirationStatus") == "warning"]

    if not expired and not critical:
        logger.info("No expired or critical items found — skipping notifications")
        return

    summary = {
        "expired": len(expired),
        "critical": len(critical),
        "warning": len(warning),
        "total": len(items),
    }

    logger.info(
        f"Notification trigger: {summary['expired']} expired, "
        f"{summary['critical']} critical, {summary['warning']} warning"
    )

    # Send email notification
    if notification_settings.get("emailEnabled"):
        recipients = notification_settings.get("emailRecipients", [])
        email_from = notification_settings.get("emailFrom", "")
        if recipients and email_from:
            try:
                await send_expiration_email(
                    expired=expired,
                    critical=critical,
                    recipients=recipients,
                    from_address=email_from,
                )
            except Exception as e:
                logger.error(f"Failed to send email notification: {e}")

    # Send Teams notification
    if notification_settings.get("teamsEnabled"):
        webhook_url = notification_settings.get("teamsWebhookUrl", "")
        if webhook_url:
            try:
                await send_teams_alert(
                    expired=expired,
                    critical=critical,
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.error(f"Failed to send Teams notification: {e}")

    # Send Slack notification
    if notification_settings.get("slackEnabled"):
        webhook_url = notification_settings.get("slackWebhookUrl", "")
        if webhook_url:
            try:
                await send_slack_alert(
                    expired=expired,
                    critical=critical,
                    webhook_url=webhook_url,
                )
            except Exception as e:
                logger.error(f"Failed to send Slack notification: {e}")

    # Send generic webhook notification
    if notification_settings.get("webhookEnabled"):
        webhook_url = notification_settings.get("genericWebhookUrl", "")
        custom_headers = notification_settings.get("webhookHeaders", {})
        if webhook_url:
            try:
                await send_generic_webhook(
                    expired=expired,
                    critical=critical,
                    warning=warning,
                    webhook_url=webhook_url,
                    headers=custom_headers,
                )
            except Exception as e:
                logger.error(f"Failed to send generic webhook notification: {e}")
