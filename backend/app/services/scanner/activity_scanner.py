"""App activity scanner — fetches sign-in logs and builds inventory records.

Runs as Phase 5 of the scan orchestrator. Uses Graph Beta API for richer data:
- /beta/reports/servicePrincipalSignInActivities for pre-aggregated last sign-in
- /beta/reports/appCredentialSignInActivities for per-credential usage
- /beta/auditLogs/signIns for detailed sign-in breakdown
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from app.config import settings
from app.db.cosmos_client import get_items_container
from app.db.queries import query_items
from app.models.app_inventory import ActivityClassification
from app.services.inventory.graph_operations import (
    fetch_sp_sign_in_activities,
    fetch_app_credential_activities,
    fetch_sign_ins_bulk,
)

GRAPH_SCOPE = "https://graph.microsoft.com/.default"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SP activity aggregation (pre-aggregated from Beta reports API)
# ---------------------------------------------------------------------------

def aggregate_sp_activities(records: list[dict]) -> dict[str, dict]:
    """Parse the servicePrincipalSignInActivities Beta response into a lookup.

    Beta response fields per record:
      - lastSignInActivity                          (most recent across all auth types)
      - applicationAuthenticationClientSignInActivity (SP as client, app-only auth)
      - applicationAuthenticationResourceSignInActivity (SP as resource, app-only auth)
      - delegatedClientSignInActivity               (SP as client, delegated auth)
      - delegatedResourceSignInActivity             (SP as resource, delegated auth)

    Each contains {lastSignInDateTime, lastSignInRequestId}.

    Returns {appId: {lastSignIn, appClientLastSignIn, appResourceLastSignIn,
    delegatedClientLastSignIn, delegatedResourceLastSignIn}}.
    """
    result: dict[str, dict] = {}
    for rec in records:
        app_id = rec.get("appId", "")
        if not app_id:
            continue

        last_activity = rec.get("lastSignInActivity") or {}
        app_client = rec.get("applicationAuthenticationClientSignInActivity") or {}
        app_resource = rec.get("applicationAuthenticationResourceSignInActivity") or {}
        delegated_client = rec.get("delegatedClientSignInActivity") or {}
        delegated_resource = rec.get("delegatedResourceSignInActivity") or {}

        result[app_id] = {
            "lastSignIn": last_activity.get("lastSignInDateTime"),
            "appClientLastSignIn": app_client.get("lastSignInDateTime"),
            "appResourceLastSignIn": app_resource.get("lastSignInDateTime"),
            "delegatedClientLastSignIn": delegated_client.get("lastSignInDateTime"),
            "delegatedResourceLastSignIn": delegated_resource.get("lastSignInDateTime"),
        }
    return result


# ---------------------------------------------------------------------------
# Credential activity aggregation
# ---------------------------------------------------------------------------

def aggregate_credential_activities(records: list[dict]) -> dict[str, list[dict]]:
    """Parse appCredentialSignInActivities into per-app credential usage.

    Returns {appId: [{keyId, keyType, credentialOrigin, lastSignIn, expirationDate}]}.
    """
    per_app: dict[str, list[dict]] = defaultdict(list)
    for rec in records:
        app_id = rec.get("appId", "")
        if not app_id:
            continue

        sign_in_activity = rec.get("signInActivity") or {}
        per_app[app_id].append({
            "keyId": rec.get("keyId", ""),
            "keyType": rec.get("keyType", "unknown"),
            "credentialOrigin": rec.get("credentialOrigin", ""),
            "lastSignIn": sign_in_activity.get("lastSignInDateTime"),
            "expirationDate": rec.get("expirationDate"),
            "resourceId": rec.get("resourceId", ""),
        })
    return per_app


# ---------------------------------------------------------------------------
# Detailed sign-in aggregation (from auditLogs/signIns)
# ---------------------------------------------------------------------------

def aggregate_sign_ins(raw_sign_ins: list[dict]) -> dict[str, dict]:
    """Group raw sign-in records by appId and compute per-app summaries.

    Returns {appId: {count, interactiveCount, nonInteractiveCount,
    servicePrincipalCount, lastSignIn, uniqueUsers, topUsers,
    locations, deviceTypes, riskySigns}}.
    """
    per_app: dict[str, dict] = defaultdict(lambda: {
        "count": 0,
        "interactiveCount": 0,
        "nonInteractiveCount": 0,
        "servicePrincipalCount": 0,
        "managedIdentityCount": 0,
        "lastSignIn": None,
        "users": defaultdict(lambda: {"displayName": "", "count": 0}),
        "locations": defaultdict(int),
        "deviceBrowsers": defaultdict(int),
        "clientApps": defaultdict(int),
        "failedCount": 0,
    })

    for record in raw_sign_ins:
        app_id = record.get("appId", "")
        if not app_id:
            continue

        app = per_app[app_id]
        app["count"] += 1

        # Track sign-in type (Beta has both signInEventTypes and isInteractive)
        event_types = record.get("signInEventTypes", []) or []
        is_interactive = record.get("isInteractive")

        if "servicePrincipal" in event_types:
            app["servicePrincipalCount"] += 1
        elif "managedIdentity" in event_types:
            app["managedIdentityCount"] += 1
        elif "nonInteractiveUser" in event_types or is_interactive is False:
            app["nonInteractiveCount"] += 1
        else:
            app["interactiveCount"] += 1

        # Track failures
        status = record.get("status") or {}
        if status.get("errorCode", 0) != 0:
            app["failedCount"] += 1

        # Track last sign-in time
        created = record.get("createdDateTime")
        if created:
            if app["lastSignIn"] is None or created > app["lastSignIn"]:
                app["lastSignIn"] = created

        # Track users
        upn = record.get("userPrincipalName", "")
        if upn:
            app["users"][upn]["displayName"] = record.get("userDisplayName", "")
            app["users"][upn]["count"] += 1

        # Track locations (Beta field)
        location = record.get("location") or {}
        country = location.get("countryOrRegion", "")
        city = location.get("city", "")
        if country:
            loc_key = f"{city}, {country}" if city else country
            app["locations"][loc_key] += 1

        # Track device/browser info (Beta field)
        device = record.get("deviceDetail") or {}
        browser = device.get("browser", "")
        if browser:
            app["deviceBrowsers"][browser] += 1

        # Track client app types
        client_app = record.get("clientAppUsed", "")
        if client_app:
            app["clientApps"][client_app] += 1

    # Finalize
    result = {}
    for app_id, app in per_app.items():
        users = app.pop("users")
        locations_raw = app.pop("locations")
        browsers_raw = app.pop("deviceBrowsers")
        client_apps_raw = app.pop("clientApps")

        sorted_users = sorted(users.items(), key=lambda x: x[1]["count"], reverse=True)
        app["uniqueUsers"] = len(users)
        app["topUsers"] = [
            {"userPrincipalName": upn, "displayName": info["displayName"], "count": info["count"]}
            for upn, info in sorted_users[:10]
        ]

        # Top locations
        sorted_locs = sorted(locations_raw.items(), key=lambda x: x[1], reverse=True)
        app["topLocations"] = [{"location": loc, "count": c} for loc, c in sorted_locs[:5]]

        # Top browsers
        sorted_browsers = sorted(browsers_raw.items(), key=lambda x: x[1], reverse=True)
        app["topBrowsers"] = [{"browser": b, "count": c} for b, c in sorted_browsers[:5]]

        # Top client apps
        sorted_clients = sorted(client_apps_raw.items(), key=lambda x: x[1], reverse=True)
        app["topClientApps"] = [{"clientApp": ca, "count": c} for ca, c in sorted_clients[:5]]

        result[app_id] = app

    return result


# ---------------------------------------------------------------------------
# Credential aggregation from Cosmos
# ---------------------------------------------------------------------------

async def _get_credential_summaries() -> dict[str, dict]:
    """Query all credential items from Cosmos and aggregate per appId."""
    container = get_items_container()
    query = (
        "SELECT c.appId, c.appObjectId, c.servicePrincipalId, c.appDisplayName, "
        "c.itemType, c.expirationStatus, c.expiresOn, c.source, c.accountEnabled "
        "FROM c WHERE c.source IN ('app_registration', 'enterprise_app')"
    )
    items = await query_items(container, query)

    per_app: dict[str, dict] = {}
    for item in items:
        app_id = item.get("appId", "")
        if not app_id:
            continue

        if app_id not in per_app:
            per_app[app_id] = {
                "totalSecrets": 0, "activeSecrets": 0, "expiredSecrets": 0,
                "totalCertificates": 0, "activeCertificates": 0, "expiredCertificates": 0,
                "nearestExpiry": None,
                "appObjectId": "", "servicePrincipalId": "", "appDisplayName": "",
                "accountEnabled": True, "sources": set(),
            }

        summary = per_app[app_id]
        summary["sources"].add(item.get("source", ""))

        if item.get("appObjectId"):
            summary["appObjectId"] = item["appObjectId"]
        if item.get("servicePrincipalId"):
            summary["servicePrincipalId"] = item["servicePrincipalId"]
        if item.get("appDisplayName"):
            summary["appDisplayName"] = item["appDisplayName"]
        if item.get("accountEnabled") is not None:
            summary["accountEnabled"] = item["accountEnabled"]

        item_type = item.get("itemType", "")
        is_expired = item.get("expirationStatus") == "expired"

        if item_type in ("client_secret",):
            summary["totalSecrets"] += 1
            if is_expired:
                summary["expiredSecrets"] += 1
            else:
                summary["activeSecrets"] += 1
        elif item_type in ("certificate", "saml_certificate"):
            summary["totalCertificates"] += 1
            if is_expired:
                summary["expiredCertificates"] += 1
            else:
                summary["activeCertificates"] += 1

        expires_on = item.get("expiresOn")
        if expires_on and not is_expired:
            if summary["nearestExpiry"] is None or expires_on < summary["nearestExpiry"]:
                summary["nearestExpiry"] = expires_on

    return per_app


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_app(
    sign_in_count: int,
    active_secrets: int,
    active_certificates: int,
    account_enabled: bool,
    low_activity_threshold: int = 5,
) -> ActivityClassification:
    """Determine the activity classification for an app."""
    if not account_enabled:
        return ActivityClassification.DISABLED
    if sign_in_count == 0:
        if active_secrets == 0 and active_certificates == 0:
            return ActivityClassification.ZOMBIE
        return ActivityClassification.INACTIVE
    if sign_in_count < low_activity_threshold:
        return ActivityClassification.LOW_ACTIVITY
    return ActivityClassification.ACTIVE


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def scan_app_activity(
    credential,
    scan_run_id: str,
    bus=None,
) -> list[dict]:
    """Scan app activity and build inventory records using Graph Beta API.

    Steps:
    1. Acquire Graph token from the passed-in credential
    2. Fetch pre-aggregated SP sign-in activities (Beta reports API)
    3. Fetch per-credential sign-in activities (Beta reports API)
    4. Fetch detailed sign-in logs for user/breakdown data
    5. Load credential summaries from Cosmos
    6. Merge all data sources and classify each app
    """
    now = datetime.now(timezone.utc)
    lookback_days = settings.inventory_sign_in_lookback_days
    since = now - timedelta(days=lookback_days)
    low_threshold = settings.inventory_low_activity_threshold

    # 1. Get Graph token from the passed-in credential (delegated or service principal)
    if bus:
        await bus.emit("progress", "Acquiring Graph API token...", phase="app_inventory")
    token_result = credential.get_token(GRAPH_SCOPE)
    token = token_result.token

    # Helper: build a page-progress callback that emits to the SSE bus
    def _make_page_cb(label: str):
        async def _on_page(page: int, total: int, has_more: bool, error: str | None):
            if bus:
                if error:
                    await bus.emit("progress", f"{label}: {error}", phase="app_inventory")
                else:
                    status = "fetching more..." if has_more else "done"
                    await bus.emit(
                        "progress",
                        f"{label}: page {page}, {total} records ({status})",
                        phase="app_inventory",
                    )
        return _on_page

    # Each Graph API step is independent — failures produce warnings, not a full abort.
    sp_activities: dict[str, dict] = {}
    cred_activities: dict[str, list[dict]] = {}
    sign_in_data: dict[str, dict] = {}
    raw_sign_ins: list[dict] = []

    # 2. Fetch pre-aggregated SP sign-in activities (Reports.Read.All — app-only)
    if bus:
        await bus.emit(
            "progress",
            "Fetching SP sign-in activities (/beta/reports/servicePrincipalSignInActivities)...",
            phase="app_inventory",
        )
    try:
        sp_activities_raw = await fetch_sp_sign_in_activities(
            token, on_page=_make_page_cb("SP sign-in activities"),
        )
        sp_activities = aggregate_sp_activities(sp_activities_raw)
        if bus:
            await bus.emit(
                "progress",
                f"SP sign-in activities: {len(sp_activities)} apps",
                phase="app_inventory",
            )
    except Exception as e:
        detail = str(e) or repr(e)
        msg = f"SP sign-in activities unavailable: {detail}"
        logger.warning(msg, exc_info=True)
        if bus:
            await bus.emit("error", msg, phase="app_inventory")

    # 3. Fetch per-credential sign-in activities (Reports.Read.All — app-only)
    if bus:
        await bus.emit(
            "progress",
            "Fetching credential activities (/beta/reports/appCredentialSignInActivities)...",
            phase="app_inventory",
        )
    try:
        cred_activities_raw = await fetch_app_credential_activities(
            token, on_page=_make_page_cb("Credential activities"),
        )
        cred_activities = aggregate_credential_activities(cred_activities_raw)
        if bus:
            await bus.emit(
                "progress",
                f"Credential activities: {len(cred_activities)} apps",
                phase="app_inventory",
            )
    except Exception as e:
        detail = str(e) or repr(e)
        msg = f"Credential sign-in activities unavailable: {detail}"
        logger.warning(msg, exc_info=True)
        if bus:
            await bus.emit("error", msg, phase="app_inventory")

    # 4. Fetch detailed sign-in logs for user breakdown (AuditLog.Read.All)
    if bus:
        await bus.emit(
            "progress",
            f"Fetching sign-in logs (/beta/auditLogs/signIns, last {lookback_days}d)...",
            phase="app_inventory",
        )
    try:
        raw_sign_ins = await fetch_sign_ins_bulk(
            token, since, max_pages=settings.inventory_bulk_max_pages,
            on_page=_make_page_cb("Sign-in logs"),
        )
        if bus:
            await bus.emit(
                "progress",
                f"Aggregating {len(raw_sign_ins)} sign-in records...",
                phase="app_inventory",
            )
        sign_in_data = aggregate_sign_ins(raw_sign_ins)
    except Exception as e:
        detail = str(e) or repr(e)
        msg = f"Detailed sign-in logs unavailable: {detail}"
        logger.warning(msg, exc_info=True)
        if bus:
            await bus.emit("error", msg, phase="app_inventory")

    # 5. Load credential summaries from Cosmos
    if bus:
        await bus.emit("progress", "Loading credential data...", phase="app_inventory")
    cred_data = await _get_credential_summaries()

    # 6. Merge and classify
    all_app_ids = set(sign_in_data.keys()) | set(cred_data.keys()) | set(sp_activities.keys())

    inventory_docs = []
    for app_id in all_app_ids:
        sign_ins = sign_in_data.get(app_id, {})
        creds = cred_data.get(app_id, {})
        sp_act = sp_activities.get(app_id, {})
        cred_act = cred_activities.get(app_id, [])

        sources = creds.get("sources", set())
        if "app_registration" in sources and "enterprise_app" in sources:
            app_type = "both"
        elif "enterprise_app" in sources:
            app_type = "enterprise_app"
        elif "app_registration" in sources:
            app_type = "app_registration"
        else:
            app_type = "unknown"

        active_secrets = creds.get("activeSecrets", 0)
        active_certs = creds.get("activeCertificates", 0)
        account_enabled = creds.get("accountEnabled", True)
        sign_in_count = sign_ins.get("count", 0)

        classification = classify_app(
            sign_in_count, active_secrets, active_certs,
            account_enabled, low_threshold,
        )

        # Display name: prefer credential data, fall back to sign-in data
        display_name = creds.get("appDisplayName", "")
        if not display_name:
            for rec in raw_sign_ins:
                if rec.get("appId") == app_id and rec.get("appDisplayName"):
                    display_name = rec["appDisplayName"]
                    break

        # Best last sign-in: pick the most recent from any source
        last_sign_in_candidates = [
            sign_ins.get("lastSignIn"),
            sp_act.get("lastSignIn"),
            sp_act.get("appClientLastSignIn"),
            sp_act.get("appResourceLastSignIn"),
            sp_act.get("delegatedClientLastSignIn"),
            sp_act.get("delegatedResourceLastSignIn"),
        ]
        last_sign_in_at = max(
            (ts for ts in last_sign_in_candidates if ts),
            default=None,
        )

        doc = {
            "id": f"inventory-{app_id}",
            "partitionKey": "inventory",
            "itemType": "app_inventory",
            "appId": app_id,
            "appObjectId": creds.get("appObjectId", ""),
            "servicePrincipalId": creds.get("servicePrincipalId", ""),
            "appDisplayName": display_name,
            "appType": app_type,
            "accountEnabled": account_enabled,
            # Credential summary
            "totalSecrets": creds.get("totalSecrets", 0),
            "activeSecrets": active_secrets,
            "expiredSecrets": creds.get("expiredSecrets", 0),
            "totalCertificates": creds.get("totalCertificates", 0),
            "activeCertificates": active_certs,
            "expiredCertificates": creds.get("expiredCertificates", 0),
            "nearestExpiry": creds.get("nearestExpiry"),
            # Sign-in summary (from detailed logs)
            "signInCount30d": sign_in_count,
            "interactiveSignInCount": sign_ins.get("interactiveCount", 0),
            "nonInteractiveSignInCount": sign_ins.get("nonInteractiveCount", 0),
            "servicePrincipalSignInCount": sign_ins.get("servicePrincipalCount", 0),
            "managedIdentitySignInCount": sign_ins.get("managedIdentityCount", 0),
            "failedSignInCount": sign_ins.get("failedCount", 0),
            "lastSignInAt": last_sign_in_at,
            "uniqueUsers30d": sign_ins.get("uniqueUsers", 0),
            "topUsers": sign_ins.get("topUsers", []),
            # Beta-enriched data
            "topLocations": sign_ins.get("topLocations", []),
            "topBrowsers": sign_ins.get("topBrowsers", []),
            "topClientApps": sign_ins.get("topClientApps", []),
            # SP-level activity (from Beta reports API)
            "spLastSignIn": sp_act.get("lastSignIn"),
            "appClientLastSignIn": sp_act.get("appClientLastSignIn"),
            "appResourceLastSignIn": sp_act.get("appResourceLastSignIn"),
            "delegatedClientLastSignIn": sp_act.get("delegatedClientLastSignIn"),
            "delegatedResourceLastSignIn": sp_act.get("delegatedResourceLastSignIn"),
            # Credential-level activity
            "credentialActivities": cred_act,
            # Classification & audit
            "activityClassification": classification.value,
            "lastActivityScannedAt": now.isoformat(),
            "scanRunId": scan_run_id,
            "lastScannedAt": now.isoformat(),
        }
        inventory_docs.append(doc)

    logger.info(
        f"Built inventory for {len(inventory_docs)} apps: "
        f"{sum(1 for d in inventory_docs if d['activityClassification'] == 'active')} active, "
        f"{sum(1 for d in inventory_docs if d['activityClassification'] == 'inactive')} inactive, "
        f"{sum(1 for d in inventory_docs if d['activityClassification'] == 'zombie')} zombie"
    )
    return inventory_docs
