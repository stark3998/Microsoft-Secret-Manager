import asyncio
import logging
import uuid
from datetime import datetime, timezone

from app.db.cosmos_client import get_items_container, get_scan_history_container, get_settings_container
from app.db.queries import query_items, upsert_item, upsert_items_batch
from app.services.scanner.subscription_scanner import enumerate_subscriptions
from app.services.scanner.keyvault_scanner import scan_subscription
from app.services.scanner.graph_scanner import scan_app_registrations, scan_enterprise_apps
from app.services.notification.engine import evaluate_and_notify
from app.utils.azure_credential import get_azure_credential

logger = logging.getLogger(__name__)

# Concurrency limit to avoid Azure API throttling
SCAN_SEMAPHORE = asyncio.Semaphore(10)


async def run_full_scan(triggered_by: str = "system") -> dict:
    """Run a complete scan of all Key Vaults, App Registrations, and Enterprise Apps."""
    scan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    scan_doc = {
        "id": scan_id,
        "status": "running",
        "trigger": "manual" if triggered_by != "system" else "scheduled",
        "startedAt": now.isoformat(),
        "completedAt": None,
        "subscriptionsScanned": 0,
        "vaultsScanned": 0,
        "itemsFound": 0,
        "appRegistrationsScanned": 0,
        "enterpriseAppsScanned": 0,
        "newExpiredFound": 0,
        "errors": [],
        "triggeredBy": triggered_by,
    }

    scan_history = get_scan_history_container()
    await upsert_item(scan_history, scan_doc)

    try:
        credential = get_azure_credential()

        # Load settings for subscription filter and thresholds
        settings_container = get_settings_container()
        schedule_settings = await query_items(
            settings_container, "SELECT * FROM c WHERE c.id = 'schedule'"
        )
        threshold_settings = await query_items(
            settings_container, "SELECT * FROM c WHERE c.id = 'thresholds'"
        )

        sub_filter = []
        if schedule_settings:
            sub_filter = schedule_settings[0].get("subscriptionFilter", [])

        tiers = None
        if threshold_settings:
            tiers = threshold_settings[0].get("tiers", None)

        # 1. Enumerate subscriptions
        subscriptions = await enumerate_subscriptions(credential, sub_filter or None)
        scan_doc["subscriptionsScanned"] = len(subscriptions)

        # 2. Scan Key Vaults per subscription (with concurrency limit)
        items_container = get_items_container()
        all_kv_items = []

        async def scan_sub(sub):
            async with SCAN_SEMAPHORE:
                return await scan_subscription(
                    credential,
                    sub["subscriptionId"],
                    sub["displayName"],
                    scan_id,
                    tiers,
                )

        tasks = [scan_sub(sub) for sub in subscriptions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                error_msg = f"Error scanning subscription {subscriptions[i]['displayName']}: {result}"
                logger.error(error_msg)
                scan_doc["errors"].append(error_msg)
            else:
                all_kv_items.extend(result)

        # Upsert Key Vault items
        if all_kv_items:
            await upsert_items_batch(items_container, all_kv_items)
        scan_doc["itemsFound"] += len(all_kv_items)

        # 3. Scan App Registrations via Graph API
        try:
            app_reg_items, app_count = await scan_app_registrations(credential, scan_id, tiers)
            scan_doc["appRegistrationsScanned"] = app_count
            if app_reg_items:
                await upsert_items_batch(items_container, app_reg_items)
            scan_doc["itemsFound"] += len(app_reg_items)
        except Exception as e:
            error_msg = f"Error scanning app registrations: {e}"
            logger.error(error_msg)
            scan_doc["errors"].append(error_msg)

        # 4. Scan Enterprise Apps via Graph API
        try:
            ent_app_items, ent_count = await scan_enterprise_apps(credential, scan_id, tiers)
            scan_doc["enterpriseAppsScanned"] = ent_count
            if ent_app_items:
                await upsert_items_batch(items_container, ent_app_items)
            scan_doc["itemsFound"] += len(ent_app_items)
        except Exception as e:
            error_msg = f"Error scanning enterprise apps: {e}"
            logger.error(error_msg)
            scan_doc["errors"].append(error_msg)

        # 5. Count newly expired items
        all_items = all_kv_items + (app_reg_items if 'app_reg_items' in dir() else []) + (ent_app_items if 'ent_app_items' in dir() else [])
        expired = [i for i in all_items if i.get("expirationStatus") == "expired"]
        scan_doc["newExpiredFound"] = len(expired)

        # 6. Trigger notifications
        try:
            notification_settings = await query_items(
                settings_container, "SELECT * FROM c WHERE c.id = 'notifications'"
            )
            if notification_settings:
                await evaluate_and_notify(all_items, notification_settings[0])
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")

        scan_doc["status"] = "completed"

    except Exception as e:
        logger.error(f"Full scan failed: {e}")
        scan_doc["status"] = "failed"
        scan_doc["errors"].append(str(e))

    scan_doc["completedAt"] = datetime.now(timezone.utc).isoformat()
    await upsert_item(scan_history, scan_doc)

    logger.info(
        f"Scan {scan_id} {scan_doc['status']}: "
        f"{scan_doc['itemsFound']} items found, "
        f"{scan_doc['newExpiredFound']} expired"
    )
    return scan_doc
