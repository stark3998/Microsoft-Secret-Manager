import logging

from msgraph import GraphServiceClient
from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)


def _build_html_table(items: list[dict], title: str) -> str:
    """Build an HTML table for a list of items."""
    if not items:
        return ""

    rows = ""
    for item in items[:50]:  # Limit to 50 items per section
        name = item.get("itemName") or item.get("appDisplayName") or "Unknown"
        source = item.get("source", "")
        vault_or_app = item.get("vaultName") or item.get("appDisplayName") or ""
        expires = item.get("expiresOn", "N/A")
        days = item.get("daysUntilExpiration", "N/A")
        item_type = item.get("itemType", "")

        rows += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">{name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{item_type}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{source}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{vault_or_app}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{expires}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{days} days</td>
        </tr>"""

    return f"""
    <h3 style="color: #333;">{title} ({len(items)} items)</h3>
    <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <thead>
            <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Type</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Source</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Location</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Expires</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Days</th>
            </tr>
        </thead>
        <tbody>{rows}
        </tbody>
    </table>"""


async def send_expiration_email(
    expired: list[dict],
    critical: list[dict],
    recipients: list[str],
    from_address: str,
) -> None:
    """Send an expiration alert email via Microsoft Graph API."""
    credential = get_azure_credential()
    graph_client = GraphServiceClient(credential)

    expired_table = _build_html_table(expired, "Expired Items")
    critical_table = _build_html_table(critical, "Critical Items (Expiring Soon)")

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Secret Manager — Expiration Alert</h2>
        <p>The following secrets, keys, and certificates require attention:</p>
        {expired_table}
        {critical_table}
        <p style="margin-top: 20px; color: #666;">
            This is an automated alert from MS Secret Manager.
        </p>
    </body>
    </html>
    """

    to_recipients = [
        {"emailAddress": {"address": r}} for r in recipients
    ]

    message = {
        "subject": f"Secret Manager Alert: {len(expired)} expired, {len(critical)} critical",
        "body": {"contentType": "HTML", "content": html_body},
        "toRecipients": to_recipients,
    }

    await graph_client.users.by_user_id(from_address).send_mail.post(
        body={"message": message, "saveToSentItems": False}
    )

    logger.info(f"Expiration email sent to {len(recipients)} recipients")
