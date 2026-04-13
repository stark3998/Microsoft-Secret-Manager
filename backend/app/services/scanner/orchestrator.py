import asyncio
import logging
import uuid
from datetime import datetime, timezone

from app.db.cosmos_client import get_items_container, get_scan_history_container, get_settings_container
from app.db.queries import query_items, upsert_item, upsert_items_batch, delete_items_by_type
from app.services.scanner.subscription_scanner import enumerate_subscriptions
from app.services.scanner.keyvault_scanner import scan_subscription
from app.services.scanner.graph_scanner import scan_app_registrations, scan_enterprise_apps
from app.services.scanner.activity_scanner import scan_app_activity
from app.services.notification.engine import evaluate_and_notify
from app.utils.azure_credential import get_azure_credential
from app.services.scanner.event_bus import ScanEventBus

logger = logging.getLogger(__name__)

# Concurrency limit to avoid Azure API throttling
SCAN_SEMAPHORE = asyncio.Semaphore(10)


async def run_full_scan(
    triggered_by: str = "system",
    credential=None,
    scan_id: str | None = None,
) -> dict:
    """Run a complete scan of all Key Vaults, App Registrations, and Enterprise Apps.

    Args:
        triggered_by: User email or "system" for scheduled scans.
        credential: Optional pre-built credential (e.g. DelegatedTokenCredential).
                    Falls back to the service-principal DefaultAzureCredential.
        scan_id: Optional pre-generated scan ID (used to link SSE streaming).
    """
    if scan_id is None:
        scan_id = str(uuid.uuid4())

    now = datetime.now(timezone.utc)
    cred_mode = "delegated" if credential else "service_principal"

    # Get or create event bus for this scan
    bus = ScanEventBus.get(scan_id) or ScanEventBus.create(scan_id)

    scan_doc = {
        "id": scan_id,
        "status": "running",
        "trigger": "manual" if triggered_by != "system" else "scheduled",
        "credentialMode": cred_mode,
        "startedAt": now.isoformat(),
        "completedAt": None,
        "subscriptionsScanned": 0,
        "vaultsScanned": 0,
        "itemsFound": 0,
        "appRegistrationsScanned": 0,
        "enterpriseAppsScanned": 0,
        "inventoryAppsScanned": 0,
        "newExpiredFound": 0,
        "errors": [],
        "triggeredBy": triggered_by,
    }

    scan_history = get_scan_history_container()
    await upsert_item(scan_history, scan_doc)

    await bus.emit("log", f"Scan started by {triggered_by} using {cred_mode} credentials", phase="init")

    try:
        if credential is None:
            credential = get_azure_credential()

        # Load settings for subscription filter and thresholds
        await bus.emit("log", "Loading scan settings...", phase="settings")
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

        await bus.emit("log", "Settings loaded", phase="settings")

        # 0. Purge previous scan data (this is a full scan, not incremental)
        await bus.emit("phase_start", "Clearing previous scan data...", phase="purge")
        items_container = get_items_container()
        purge_types = [
            "secret", "key", "certificate",           # Key Vault items
            "client_secret",                           # App Registration credentials
            "saml_certificate",                        # Enterprise App certs
            "app_inventory",                           # App inventory records
        ]
        deleted_count = await delete_items_by_type(items_container, purge_types)
        await bus.emit(
            "phase_complete",
            f"Cleared {deleted_count} items from previous scan",
            phase="purge",
            count=deleted_count,
        )

        # 1. Enumerate subscriptions
        await bus.emit("phase_start", "Enumerating Azure subscriptions...", phase="subscriptions")
        subscriptions = await enumerate_subscriptions(credential, sub_filter or None)
        scan_doc["subscriptionsScanned"] = len(subscriptions)
        await bus.emit(
            "phase_complete",
            f"Found {len(subscriptions)} subscriptions",
            phase="subscriptions",
            count=len(subscriptions),
        )

        # 2. Scan Key Vaults per subscription (with concurrency limit)
        await bus.emit("phase_start", "Scanning Key Vaults across subscriptions...", phase="keyvault")
        all_kv_items = []
        total_vaults_found = 0
        total_vaults_accessible = 0

        async def scan_sub(sub, index):
            async with SCAN_SEMAPHORE:
                await bus.emit(
                    "progress",
                    f"Scanning subscription \"{sub['displayName']}\" ({index}/{len(subscriptions)})...",
                    phase="keyvault",
                )
                return await scan_subscription(
                    credential,
                    sub["subscriptionId"],
                    sub["displayName"],
                    scan_id,
                    tiers,
                )

        tasks = [scan_sub(sub, i + 1) for i, sub in enumerate(subscriptions)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                error_msg = f"Error scanning subscription {subscriptions[i]['displayName']}: {result}"
                logger.exception(error_msg)
                scan_doc["errors"].append(error_msg)
                await bus.emit("error", error_msg, phase="keyvault")
            else:
                all_kv_items.extend(result.items)
                total_vaults_found += result.vaults_found
                total_vaults_accessible += result.vaults_accessible

                # Surface vault-level warnings (access denied, etc.)
                for warning in result.warnings:
                    scan_doc["errors"].append(warning)
                    await bus.emit("error", warning, phase="keyvault")

                denied = result.vaults_found - result.vaults_accessible
                status_detail = f"{result.vaults_found} vaults"
                if denied > 0:
                    status_detail += f" ({denied} access denied)"

                await bus.emit(
                    "progress",
                    f"\"{subscriptions[i]['displayName']}\": {status_detail}, {len(result.items)} items",
                    phase="keyvault",
                )

        # Upsert Key Vault items
        if all_kv_items:
            await upsert_items_batch(items_container, all_kv_items)
        scan_doc["itemsFound"] += len(all_kv_items)
        scan_doc["vaultsScanned"] = total_vaults_accessible

        denied_total = total_vaults_found - total_vaults_accessible
        complete_msg = (
            f"Key Vault scan complete: {len(all_kv_items)} items from "
            f"{total_vaults_accessible}/{total_vaults_found} vaults "
            f"across {len(subscriptions)} subscriptions"
        )
        if denied_total > 0:
            complete_msg += f" ({denied_total} vaults denied — check RBAC)"
        await bus.emit(
            "phase_complete",
            complete_msg,
            phase="keyvault",
            count=len(all_kv_items),
        )

        # 3. Scan App Registrations via Graph API
        app_reg_items: list[dict] = []
        await bus.emit("phase_start", "Scanning App Registrations via Microsoft Graph...", phase="app_registrations")
        try:
            app_reg_items, app_count = await scan_app_registrations(credential, scan_id, tiers)
            scan_doc["appRegistrationsScanned"] = app_count
            if app_reg_items:
                await upsert_items_batch(items_container, app_reg_items)
            scan_doc["itemsFound"] += len(app_reg_items)
            await bus.emit(
                "phase_complete",
                f"Found {app_count} app registrations with {len(app_reg_items)} credentials",
                phase="app_registrations",
                appCount=app_count,
                credentialCount=len(app_reg_items),
            )
        except Exception as e:
            error_msg = f"Error scanning app registrations: {e}"
            logger.exception(error_msg)
            scan_doc["errors"].append(error_msg)
            await bus.emit("error", error_msg, phase="app_registrations")

        # 4. Scan Enterprise Apps via Graph API
        ent_app_items: list[dict] = []
        await bus.emit("phase_start", "Scanning Enterprise Apps via Microsoft Graph...", phase="enterprise_apps")
        try:
            ent_app_items, ent_count, _sp_metadata = await scan_enterprise_apps(credential, scan_id, tiers)
            scan_doc["enterpriseAppsScanned"] = ent_count

            # Deduplicate: remove enterprise app credentials already found in
            # app registrations (same appId + credentialId = same underlying credential)
            if app_reg_items and ent_app_items:
                seen_creds = {
                    (item.get("appId"), item.get("credentialId"))
                    for item in app_reg_items
                    if item.get("credentialId")
                }
                before = len(ent_app_items)
                ent_app_items = [
                    item for item in ent_app_items
                    if (item.get("appId"), item.get("credentialId")) not in seen_creds
                       or not item.get("credentialId")
                ]
                deduped = before - len(ent_app_items)
                if deduped:
                    logger.info(f"Deduplicated {deduped} enterprise app credentials already in app registrations")

            if ent_app_items:
                await upsert_items_batch(items_container, ent_app_items)
            scan_doc["itemsFound"] += len(ent_app_items)
            await bus.emit(
                "phase_complete",
                f"Found {ent_count} enterprise apps with {len(ent_app_items)} credentials",
                phase="enterprise_apps",
                appCount=ent_count,
                credentialCount=len(ent_app_items),
            )
        except Exception as e:
            error_msg = f"Error scanning enterprise apps: {e}"
            logger.exception(error_msg)
            scan_doc["errors"].append(error_msg)
            await bus.emit("error", error_msg, phase="enterprise_apps")

        # 5. Build App Inventory (activity scanning)
        from app.config import settings as app_settings
        if app_settings.inventory_scan_enabled:
            await bus.emit("phase_start", "Building app inventory and scanning activity...", phase="app_inventory")
            try:
                inventory_items = await scan_app_activity(credential, scan_id, bus=bus)
                if inventory_items:
                    await upsert_items_batch(items_container, inventory_items)
                scan_doc["inventoryAppsScanned"] = len(inventory_items)
                await bus.emit(
                    "phase_complete",
                    f"Built inventory for {len(inventory_items)} apps",
                    phase="app_inventory",
                    count=len(inventory_items),
                )
            except Exception as e:
                detail = str(e) or repr(e)
                error_msg = f"Error building app inventory: {type(e).__name__}: {detail}"
                logger.exception(error_msg)
                scan_doc["errors"].append(error_msg)
                await bus.emit("error", error_msg, phase="app_inventory")

        # 6. Count newly expired items
        all_items = all_kv_items + app_reg_items + ent_app_items
        expired = [i for i in all_items if i.get("expirationStatus") == "expired"]
        scan_doc["newExpiredFound"] = len(expired)

        # 7. Trigger notifications
        await bus.emit("phase_start", "Evaluating notification rules...", phase="notifications")
        try:
            notification_settings = await query_items(
                settings_container, "SELECT * FROM c WHERE c.id = 'notifications'"
            )
            if notification_settings:
                await evaluate_and_notify(all_items, notification_settings[0])
            await bus.emit("phase_complete", "Notifications processed", phase="notifications")
        except Exception as e:
            logger.exception(f"Error sending notifications: {e}")
            await bus.emit("error", f"Error sending notifications: {e}", phase="notifications")

        scan_doc["status"] = "completed"
        await bus.emit(
            "complete",
            f"Scan complete: {scan_doc['itemsFound']} items found, "
            f"{scan_doc['newExpiredFound']} expired, {len(scan_doc['errors'])} errors",
            phase="done",
            itemsFound=scan_doc["itemsFound"],
            newExpiredFound=scan_doc["newExpiredFound"],
            errorCount=len(scan_doc["errors"]),
        )

    except Exception as e:
        logger.exception(f"Full scan failed: {e}")
        scan_doc["status"] = "failed"
        scan_doc["errors"].append(str(e))
        await bus.emit("failed", f"Scan failed: {e}", phase="done")

    scan_doc["completedAt"] = datetime.now(timezone.utc).isoformat()
    await upsert_item(scan_history, scan_doc)
    await bus.close()

    logger.info(
        f"Scan {scan_id} {scan_doc['status']}: "
        f"{scan_doc['itemsFound']} items found, "
        f"{scan_doc['newExpiredFound']} expired"
    )
    return scan_doc
