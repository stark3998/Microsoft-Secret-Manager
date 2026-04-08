"""Generic webhook notification sender."""

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)


def _build_webhook_payload(
    expired: list[dict], critical: list[dict], warning: list[dict]
) -> dict:
    """Build a generic JSON webhook payload."""
    return {
        "event": "expiration_alert",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "expired_count": len(expired),
            "critical_count": len(critical),
            "warning_count": len(warning),
            "total_flagged": len(expired) + len(critical) + len(warning),
        },
        "items": {
            "expired": [_item_summary(i) for i in expired[:50]],
            "critical": [_item_summary(i) for i in critical[:50]],
            "warning": [_item_summary(i) for i in warning[:50]],
        },
    }


def _item_summary(item: dict) -> dict:
    """Extract a concise summary from an item dict."""
    return {
        "name": item.get("itemName") or item.get("appDisplayName") or "Unknown",
        "type": item.get("itemType", ""),
        "source": item.get("source", ""),
        "location": item.get("vaultName") or item.get("appDisplayName") or "",
        "expires_on": item.get("expiresOn"),
        "days_until_expiration": item.get("daysUntilExpiration"),
        "status": item.get("expirationStatus", ""),
    }


async def send_generic_webhook(
    expired: list[dict],
    critical: list[dict],
    warning: list[dict],
    webhook_url: str,
    headers: dict[str, str] | None = None,
) -> None:
    """Send an expiration alert to a generic webhook endpoint.

    The payload is a structured JSON object that external systems
    (PagerDuty, Opsgenie, custom integrations) can parse.
    """
    payload = _build_webhook_payload(expired, critical, warning)
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            webhook_url,
            json=payload,
            headers=request_headers,
            timeout=30.0,
        )
        response.raise_for_status()

    logger.info(f"Generic webhook notification sent to {webhook_url}")
