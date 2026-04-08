"""Acknowledgment and snooze service for expiring items."""

import logging
from datetime import datetime, timezone, timedelta

from app.db.cosmos_client import get_items_container
from app.db.queries import query_items, upsert_item

logger = logging.getLogger(__name__)


async def acknowledge_item(
    item_id: str,
    partition_key: str,
    acknowledged_by: str,
    note: str = "",
) -> dict:
    """Mark an item as acknowledged.

    Acknowledged items still appear in dashboards but are visually
    distinguished and excluded from notifications.
    """
    container = get_items_container()
    items = await query_items(
        container,
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": item_id}],
        partition_key=partition_key,
    )
    if not items:
        raise ValueError(f"Item '{item_id}' not found")

    item = items[0]
    item["acknowledged"] = True
    item["acknowledgedBy"] = acknowledged_by
    item["acknowledgedAt"] = datetime.now(timezone.utc).isoformat()
    item["acknowledgmentNote"] = note

    await upsert_item(container, item)
    logger.info(f"Item '{item_id}' acknowledged by {acknowledged_by}")
    return item


async def snooze_item(
    item_id: str,
    partition_key: str,
    snoozed_by: str,
    snooze_days: int = 30,
    note: str = "",
) -> dict:
    """Snooze notifications for an item for a specified number of days.

    The item remains visible but notifications are suppressed until
    the snooze period expires.
    """
    container = get_items_container()
    items = await query_items(
        container,
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": item_id}],
        partition_key=partition_key,
    )
    if not items:
        raise ValueError(f"Item '{item_id}' not found")

    item = items[0]
    snooze_until = datetime.now(timezone.utc) + timedelta(days=snooze_days)
    item["snoozedUntil"] = snooze_until.isoformat()
    item["snoozedBy"] = snoozed_by
    item["snoozeNote"] = note

    await upsert_item(container, item)
    logger.info(f"Item '{item_id}' snoozed until {snooze_until.date()} by {snoozed_by}")
    return item


async def unacknowledge_item(item_id: str, partition_key: str) -> dict:
    """Remove acknowledgment from an item."""
    container = get_items_container()
    items = await query_items(
        container,
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": item_id}],
        partition_key=partition_key,
    )
    if not items:
        raise ValueError(f"Item '{item_id}' not found")

    item = items[0]
    item.pop("acknowledged", None)
    item.pop("acknowledgedBy", None)
    item.pop("acknowledgedAt", None)
    item.pop("acknowledgmentNote", None)
    item.pop("snoozedUntil", None)
    item.pop("snoozedBy", None)
    item.pop("snoozeNote", None)

    await upsert_item(container, item)
    logger.info(f"Item '{item_id}' un-acknowledged")
    return item
