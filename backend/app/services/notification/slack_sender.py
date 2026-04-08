"""Slack webhook notification sender."""

import logging

import httpx

logger = logging.getLogger(__name__)


def _build_slack_blocks(expired: list[dict], critical: list[dict]) -> list[dict]:
    """Build Slack Block Kit message payload."""
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Secret Manager — Expiration Alert",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{len(expired)}* expired | *{len(critical)}* critical",
            },
        },
        {"type": "divider"},
    ]

    if expired:
        items_text = "\n".join(
            f"• *{i.get('itemName') or i.get('appDisplayName', 'Unknown')}* — "
            f"{i.get('vaultName') or i.get('appDisplayName', '')} "
            f"(expired {abs(i.get('daysUntilExpiration', 0))} days ago)"
            for i in expired[:10]
        )
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Expired Items:*\n{items_text}"},
        })

    if critical:
        items_text = "\n".join(
            f"• *{i.get('itemName') or i.get('appDisplayName', 'Unknown')}* — "
            f"expires in {i.get('daysUntilExpiration', 0)} days"
            for i in critical[:10]
        )
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Critical Items:*\n{items_text}"},
        })

    if len(expired) > 10 or len(critical) > 10:
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Showing top 10 per category. "
                    f"Total: {len(expired)} expired, {len(critical)} critical.",
                }
            ],
        })

    return blocks


async def send_slack_alert(
    expired: list[dict],
    critical: list[dict],
    webhook_url: str,
) -> None:
    """Send a Slack notification via incoming webhook."""
    blocks = _build_slack_blocks(expired, critical)
    payload = {
        "text": f"Secret Manager Alert: {len(expired)} expired, {len(critical)} critical",
        "blocks": blocks,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
        )
        response.raise_for_status()

    logger.info("Slack notification sent successfully")
