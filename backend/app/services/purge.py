"""Scan history and stale item purge service."""

import logging
from datetime import datetime, timezone, timedelta

from app.db.cosmos_client import get_scan_history_container, get_items_container
from app.db.queries import query_items

logger = logging.getLogger(__name__)


async def purge_old_scan_history(retention_days: int = 90) -> int:
    """Delete scan history records older than retention_days.

    Returns the number of deleted records.
    """
    container = get_scan_history_container()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()

    old_records = await query_items(
        container,
        "SELECT c.id, c.status FROM c WHERE c.startedAt < @cutoff",
        [{"name": "@cutoff", "value": cutoff}],
    )

    deleted = 0
    for record in old_records:
        try:
            await container.delete_item(record["id"], partition_key=record["status"])
            deleted += 1
        except Exception as e:
            logger.warning(f"Failed to delete scan history {record['id']}: {e}")

    logger.info(f"Purged {deleted} scan history records older than {retention_days} days")
    return deleted


async def purge_stale_items(last_scan_run_id: str) -> int:
    """Remove items that were not seen in the latest scan.

    Items whose scanRunId doesn't match the latest run are considered
    stale (deleted from source). Returns count of removed items.
    """
    container = get_items_container()

    stale = await query_items(
        container,
        "SELECT c.id, c.partitionKey FROM c WHERE c.scanRunId != @runId",
        [{"name": "@runId", "value": last_scan_run_id}],
    )

    deleted = 0
    for item in stale:
        try:
            await container.delete_item(item["id"], partition_key=item["partitionKey"])
            deleted += 1
        except Exception as e:
            logger.warning(f"Failed to delete stale item {item['id']}: {e}")

    logger.info(f"Purged {deleted} stale items not in scan run {last_scan_run_id}")
    return deleted
