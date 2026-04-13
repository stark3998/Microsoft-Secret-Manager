import logging

import httpx

logger = logging.getLogger(__name__)


def _build_adaptive_card(expired: list[dict], critical: list[dict]) -> dict:
    """Build a Teams Adaptive Card payload."""
    facts_expired = []
    for item in expired[:10]:
        name = item.get("itemName") or item.get("appDisplayName") or "Unknown"
        location = item.get("vaultName") or item.get("appDisplayName") or ""
        facts_expired.append({
            "title": name,
            "value": f"{location} — expired {abs(item.get('daysUntilExpiration', 0))} days ago"
        })

    facts_critical = []
    for item in critical[:10]:
        name = item.get("itemName") or item.get("appDisplayName") or "Unknown"
        days = item.get("daysUntilExpiration", 0)
        facts_critical.append({
            "title": name,
            "value": f"Expires in {days} days"
        })

    body = [
        {
            "type": "TextBlock",
            "size": "Large",
            "weight": "Bolder",
            "text": "Secret Manager — Expiration Alert",
        },
        {
            "type": "TextBlock",
            "text": f"**{len(expired)}** expired | **{len(critical)}** critical",
            "wrap": True,
        },
    ]

    if facts_expired:
        body.append({
            "type": "TextBlock",
            "text": "**Expired Items:**",
            "weight": "Bolder",
            "spacing": "Medium",
        })
        body.append({
            "type": "FactSet",
            "facts": facts_expired,
        })

    if facts_critical:
        body.append({
            "type": "TextBlock",
            "text": "**Critical Items:**",
            "weight": "Bolder",
            "spacing": "Medium",
        })
        body.append({
            "type": "FactSet",
            "facts": facts_critical,
        })

    return {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": body,
                },
            }
        ],
    }


async def send_teams_alert(
    expired: list[dict],
    critical: list[dict],
    webhook_url: str,
) -> None:
    """Send an Adaptive Card alert to a Teams channel via webhook."""
    card = _build_adaptive_card(expired, critical)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            webhook_url,
            json=card,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
        )
        response.raise_for_status()

    logger.info("Teams notification sent successfully")


from app.services.notification.base import NotificationSender


class TeamsNotificationSender(NotificationSender):
    @property
    def channel_name(self) -> str:
        return "Teams"

    def is_enabled(self, settings: dict) -> bool:
        return bool(settings.get("teamsEnabled") and settings.get("teamsWebhookUrl"))

    async def send(self, expired, critical, warning, settings):
        await send_teams_alert(
            expired=expired,
            critical=critical,
            webhook_url=settings["teamsWebhookUrl"],
        )
