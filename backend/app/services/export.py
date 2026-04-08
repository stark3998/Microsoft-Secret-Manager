"""Export service for generating CSV and PDF reports."""

import csv
import io
import logging
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.config import settings
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items

logger = logging.getLogger(__name__)

EXPORT_COLUMNS = [
    ("itemName", "Name"),
    ("itemType", "Type"),
    ("source", "Source"),
    ("vaultName", "Vault / App"),
    ("subscriptionName", "Subscription"),
    ("expirationStatus", "Status"),
    ("daysUntilExpiration", "Days Left"),
    ("expiresOn", "Expires On"),
    ("acknowledged", "Acknowledged"),
]


async def export_items_csv(
    filters: dict | None = None,
) -> io.StringIO:
    """Export items to CSV format.

    Args:
        filters: Optional dict with keys: source, status, subscriptionId, search.

    Returns:
        StringIO buffer with CSV content.
    """
    items = await _fetch_items(filters)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([col[1] for col in EXPORT_COLUMNS])

    # Data rows
    for item in items:
        row = []
        for key, _ in EXPORT_COLUMNS:
            val = item.get(key, "")
            if key == "vaultName":
                val = item.get("vaultName") or item.get("appDisplayName") or ""
            elif key == "acknowledged":
                val = "Yes" if item.get("acknowledged") else ""
            row.append(val)
        writer.writerow(row)

    output.seek(0)
    logger.info(f"CSV export: {len(items)} items")
    return output


async def export_items_pdf(
    filters: dict | None = None,
    title: str = "Secret Manager — Expiration Report",
) -> io.BytesIO:
    """Export items to PDF format.

    Args:
        filters: Optional filter dict.
        title: Report title.

    Returns:
        BytesIO buffer with PDF content.
    """
    items = await _fetch_items(filters)

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(title, styles["Title"]))
    elements.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} | "
        f"Items: {len(items)}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 12))

    # Table header
    headers = [col[1] for col in EXPORT_COLUMNS]
    data = [headers]

    for item in items:
        row = []
        for key, _ in EXPORT_COLUMNS:
            val = item.get(key, "")
            if key == "vaultName":
                val = item.get("vaultName") or item.get("appDisplayName") or ""
            elif key == "acknowledged":
                val = "Yes" if item.get("acknowledged") else ""
            elif val is None:
                val = ""
            row.append(str(val))
        data.append(row)

    col_widths = [1.5*inch, 0.8*inch, 1.0*inch, 1.5*inch, 1.5*inch, 0.8*inch, 0.7*inch, 1.2*inch, 0.8*inch]
    table = Table(data, colWidths=col_widths, repeatRows=1)

    # Style
    style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]

    # Color-code status column (index 5)
    status_colors = {
        "expired": colors.HexColor("#ffcdd2"),
        "critical": colors.HexColor("#ffe0b2"),
        "warning": colors.HexColor("#fff9c4"),
    }
    for row_idx, row in enumerate(data[1:], start=1):
        status = row[5].lower() if len(row) > 5 else ""
        if status in status_colors:
            style_commands.append(
                ("BACKGROUND", (5, row_idx), (5, row_idx), status_colors[status])
            )

    table.setStyle(TableStyle(style_commands))
    elements.append(table)

    doc.build(elements)
    output.seek(0)
    logger.info(f"PDF export: {len(items)} items")
    return output


async def _fetch_items(filters: dict | None = None) -> list[dict]:
    """Fetch items from Cosmos DB with optional filters."""
    container = get_items_container()

    conditions = ["1=1"]
    params = []

    if filters:
        if filters.get("source"):
            conditions.append("c.source = @source")
            params.append({"name": "@source", "value": filters["source"]})
        if filters.get("status"):
            conditions.append("c.expirationStatus = @status")
            params.append({"name": "@status", "value": filters["status"]})
        if filters.get("subscriptionId"):
            conditions.append("c.subscriptionId = @subId")
            params.append({"name": "@subId", "value": filters["subscriptionId"]})
        if filters.get("search"):
            conditions.append("CONTAINS(LOWER(c.itemName), LOWER(@search))")
            params.append({"name": "@search", "value": filters["search"]})

    where = " AND ".join(conditions)
    query = f"SELECT * FROM c WHERE {where} ORDER BY c.expirationStatus, c.daysUntilExpiration"

    items = await query_items(container, query, params, max_items=settings.export_max_items)
    return items
