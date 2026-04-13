import logging

from app.services.notification.base import NotificationSender
from app.services.notification.email_sender import EmailNotificationSender
from app.services.notification.teams_sender import TeamsNotificationSender
from app.services.notification.slack_sender import SlackNotificationSender
from app.services.notification.webhook_sender import WebhookNotificationSender

logger = logging.getLogger(__name__)

# Registry of all notification channels
_senders: list[NotificationSender] = [
    EmailNotificationSender(),
    TeamsNotificationSender(),
    SlackNotificationSender(),
    WebhookNotificationSender(),
]


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

    for sender in _senders:
        await sender.try_send(expired, critical, warning, notification_settings)
