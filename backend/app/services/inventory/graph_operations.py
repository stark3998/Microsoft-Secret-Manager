"""Microsoft Graph API (Beta) operations for app inventory management.

Uses the /beta endpoint for richer sign-in data including:
- /beta/reports/servicePrincipalSignInActivities — pre-aggregated last sign-in per SP
- /beta/reports/appCredentialSignInActivities   — per-credential usage tracking
- /beta/auditLogs/signIns                       — detailed sign-in logs with device,
                                                   location, risk, conditional access
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

import httpx

from app.utils.azure_credential import get_azure_credential
from app.utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)

GRAPH_BETA = "https://graph.microsoft.com/beta"
GRAPH_V1 = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPE = "https://graph.microsoft.com/.default"


async def _get_graph_token() -> str:
    """Acquire a Graph API access token using DefaultAzureCredential."""
    credential = get_azure_credential()
    token = credential.get_token(GRAPH_SCOPE)
    return token.token


async def _graph_request(
    method: str,
    url: str,
    token: str,
    json_body: dict | None = None,
    params: dict | None = None,
    headers: dict | None = None,
) -> dict | None:
    """Make an authenticated request to the Microsoft Graph API.

    Handles rate limiting (HTTP 429) by respecting Retry-After headers.
    """
    req_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method, url, headers=req_headers, json=json_body, params=params
        )

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "10"))
            logger.warning(f"Graph API throttled, retrying after {retry_after}s")
            await asyncio.sleep(retry_after)
            response = await client.request(
                method, url, headers=req_headers, json=json_body, params=params
            )

        if response.status_code >= 400:
            # Capture raw response text before raise_for_status destroys context
            raw_text = response.text
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                e._raw_response_text = raw_text  # type: ignore[attr-defined]
                raise
        if response.status_code == 204 or not response.content:
            return None
        return response.json()


async def _paginate_graph(
    url: str,
    token: str,
    headers: dict | None = None,
    max_pages: int = 50,
) -> list[dict]:
    """Fetch all pages from a paginated Graph API endpoint."""
    all_records: list[dict] = []
    page = 0

    while url and page < max_pages:
        page += 1
        try:
            result = await _graph_request("GET", url, token, headers=headers)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                logger.warning(
                    f"Permission denied for {url.split('?')[0]} — "
                    "data from this endpoint will be unavailable"
                )
                return []
            raise

        if not result:
            break

        all_records.extend(result.get("value", []))
        url = result.get("@odata.nextLink")

    logger.info(f"Fetched {len(all_records)} records across {page} pages")
    return all_records


# ---------------------------------------------------------------------------
# Beta: Service Principal Sign-in Activity (pre-aggregated)
# ---------------------------------------------------------------------------

async def fetch_sp_sign_in_activities(token: str) -> list[dict]:
    """Fetch pre-aggregated sign-in activity for all service principals.

    Uses GET /beta/reports/servicePrincipalSignInActivities which returns
    per-SP last sign-in timestamps without needing to paginate all sign-in logs.

    Each record contains:
      - appId
      - lastSignInActivity.lastSignInDateTime
      - lastSignInActivity.lastNonInteractiveSignInDateTime
      - delegatedClientSignInActivity.lastSignInDateTime
      - delegatedClientSignInActivity.lastNonInteractiveSignInDateTime
    """
    url = f"{GRAPH_BETA}/reports/servicePrincipalSignInActivities"
    records = await _paginate_graph(url, token, max_pages=100)
    logger.info(f"Fetched SP sign-in activities for {len(records)} service principals")
    return records


# ---------------------------------------------------------------------------
# Beta: App Credential Sign-in Activity
# ---------------------------------------------------------------------------

async def fetch_app_credential_activities(token: str) -> list[dict]:
    """Fetch sign-in activity per app credential (secret/certificate).

    Uses GET /beta/reports/appCredentialSignInActivities which shows
    which specific credentials are being used for sign-in.

    Each record contains:
      - appId
      - appObjectId
      - credentialOrigin (application | servicePrincipal)
      - expirationDate
      - keyId
      - keyType (certificate | secret | unknown)
      - keyUsage (sign | verify)
      - resourceId
      - servicePrincipalObjectId
      - signInActivity.lastSignInDateTime
    """
    url = f"{GRAPH_BETA}/reports/appCredentialSignInActivities"
    records = await _paginate_graph(url, token, max_pages=100)
    logger.info(f"Fetched credential activity for {len(records)} credentials")
    return records


# ---------------------------------------------------------------------------
# Beta: Detailed sign-in logs (bulk)
# ---------------------------------------------------------------------------

async def fetch_sign_ins_bulk(
    token: str,
    since: datetime,
    max_pages: int = 50,
) -> list[dict]:
    """Fetch all sign-in logs since a given date via paginated Beta API calls.

    Beta provides richer data than v1.0 including:
    - deviceDetail (browser, OS, device name)
    - location (city, state, country)
    - riskDetail, riskLevelDuringSignIn
    - conditionalAccessStatus
    - authenticationMethodsUsed
    - mfaDetail
    """
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    url = (
        f"{GRAPH_BETA}/auditLogs/signIns"
        f"?$filter=createdDateTime ge {since_str}"
        f"&$select=appId,appDisplayName,userPrincipalName,userDisplayName,"
        f"userId,createdDateTime,signInEventTypes,status,"
        f"ipAddress,clientAppUsed,resourceDisplayName,resourceId,"
        f"deviceDetail,location,riskDetail,riskLevelDuringSignIn,"
        f"conditionalAccessStatus,authenticationMethodsUsed,"
        f"isInteractive,userAgent"
        f"&$top=999"
        f"&$orderby=createdDateTime desc"
    )
    headers = {"ConsistencyLevel": "eventual"}

    return await _paginate_graph(url, token, headers=headers, max_pages=max_pages)


# ---------------------------------------------------------------------------
# Beta: On-demand detail for a single app
# ---------------------------------------------------------------------------

async def fetch_sign_in_details(
    token: str,
    app_id: str,
    days: int = 30,
) -> list[dict]:
    """Fetch recent sign-in logs for a single app (on-demand detail view).

    Returns up to 50 recent sign-in records with full Beta detail.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    url = (
        f"{GRAPH_BETA}/auditLogs/signIns"
        f"?$filter=appId eq '{app_id}' and createdDateTime ge {since_str}"
        f"&$select=id,appId,appDisplayName,userPrincipalName,userDisplayName,"
        f"userId,createdDateTime,signInEventTypes,status,ipAddress,clientAppUsed,"
        f"resourceDisplayName,deviceDetail,location,riskDetail,"
        f"riskLevelDuringSignIn,conditionalAccessStatus,"
        f"isInteractive,userAgent"
        f"&$top=50"
        f"&$orderby=createdDateTime desc"
    )
    headers = {"ConsistencyLevel": "eventual"}

    result = await _graph_request("GET", url, token, headers=headers)
    return result.get("value", []) if result else []


# ---------------------------------------------------------------------------
# Beta: Directory audit logs for an app
# ---------------------------------------------------------------------------

async def fetch_app_audit_logs(
    token: str,
    app_id: str,
    days: int = 30,
) -> list[dict]:
    """Fetch directory audit logs targeting a specific app (on-demand).

    Captures config changes: credential additions/removals, permission grants,
    consent operations, owner changes, etc.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    url = (
        f"{GRAPH_BETA}/auditLogs/directoryAudits"
        f"?$filter=activityDateTime ge {since_str}"
        f" and targetResources/any(r: r/id eq '{app_id}')"
        f"&$select=id,activityDisplayName,activityDateTime,result,"
        f"initiatedBy,targetResources,category,operationType"
        f"&$top=50"
        f"&$orderby=activityDateTime desc"
    )
    headers = {"ConsistencyLevel": "eventual"}

    result = await _graph_request("GET", url, token, headers=headers)
    return result.get("value", []) if result else []


# ---------------------------------------------------------------------------
# Raw Graph API responses for an app (Beta — for developer/debug view)
# ---------------------------------------------------------------------------

def _format_graph_error(e: Exception, endpoint: str) -> dict:
    """Format a Graph API error into a user-friendly dict, including raw response."""
    error_str = str(e)

    # Extract raw response text from httpx exceptions
    raw_response = getattr(e, "_raw_response_text", None)
    if raw_response is None and isinstance(e, httpx.HTTPStatusError):
        try:
            raw_response = e.response.text
        except Exception:
            pass

    result: dict = {"error": error_str, "endpoint": endpoint}

    if raw_response:
        result["rawResponse"] = raw_response

    if "403" in error_str:
        result["error"] = "Permission denied (403)"
        # Check raw response for specific Graph error code
        if raw_response and "MSGraphPermissionMissing" in raw_response:
            result["detail"] = (
                "The MSAL app registration is missing the 'AuditLog.Read.All' "
                "delegated permission. Go to Azure Portal → App Registrations → "
                "your MSAL client app → API Permissions → Add 'AuditLog.Read.All' "
                "(Microsoft Graph, Delegated) → Grant admin consent."
            )
        else:
            result["detail"] = (
                "This endpoint requires 'AuditLog.Read.All' permission on the app "
                "registration (with admin consent) and the signed-in user must have "
                "a 'Reports Reader', 'Security Reader', 'Global Reader', "
                "or 'Security Administrator' Entra ID role assigned."
            )

    return result


async def fetch_app_graph_raw(token: str, app_id: str) -> dict:
    """Fetch raw Graph API responses for an app.

    Returns the unmodified JSON from multiple Beta endpoints.
    Each section handles errors independently — a 403 on one endpoint
    won't block the others.
    """
    results: dict = {}
    since = datetime.now(timezone.utc) - timedelta(days=30)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    # App Registration
    try:
        url = f"{GRAPH_BETA}/applications?$filter=appId eq '{app_id}'"
        headers = {"ConsistencyLevel": "eventual"}
        resp = await _graph_request("GET", url, token, headers=headers)
        values = resp.get("value", []) if resp else []
        results["application"] = values[0] if values else None
    except Exception as e:
        results["application"] = _format_graph_error(e, "/beta/applications")

    # Service Principal
    try:
        url = f"{GRAPH_BETA}/servicePrincipals?$filter=appId eq '{app_id}'"
        headers = {"ConsistencyLevel": "eventual"}
        resp = await _graph_request("GET", url, token, headers=headers)
        values = resp.get("value", []) if resp else []
        results["servicePrincipal"] = values[0] if values else None
    except Exception as e:
        results["servicePrincipal"] = _format_graph_error(e, "/beta/servicePrincipals")

    # Recent sign-in logs (delegated-friendly — AuditLog.Read.All)
    try:
        url = (
            f"{GRAPH_BETA}/auditLogs/signIns"
            f"?$filter=appId eq '{app_id}' and createdDateTime ge {since_str}"
            f"&$top=25&$orderby=createdDateTime desc"
        )
        headers = {"ConsistencyLevel": "eventual"}
        resp = await _graph_request("GET", url, token, headers=headers)
        results["recentSignIns"] = resp.get("value", []) if resp else []
    except Exception as e:
        results["recentSignIns"] = _format_graph_error(e, "/beta/auditLogs/signIns")

    # Directory audit logs (delegated-friendly — AuditLog.Read.All)
    try:
        url = (
            f"{GRAPH_BETA}/auditLogs/directoryAudits"
            f"?$filter=activityDateTime ge {since_str}"
            f" and targetResources/any(r: r/id eq '{app_id}')"
            f"&$top=25&$orderby=activityDateTime desc"
        )
        headers = {"ConsistencyLevel": "eventual"}
        resp = await _graph_request("GET", url, token, headers=headers)
        results["directoryAuditLogs"] = resp.get("value", []) if resp else []
    except Exception as e:
        results["directoryAuditLogs"] = _format_graph_error(e, "/beta/auditLogs/directoryAudits")

    # SP Sign-in Activity (requires Reports.Read.All — application-only)
    try:
        url = (
            f"{GRAPH_BETA}/reports/servicePrincipalSignInActivities"
            f"?$filter=appId eq '{app_id}'"
        )
        resp = await _graph_request("GET", url, token)
        values = resp.get("value", []) if resp else []
        results["servicePrincipalSignInActivity"] = values[0] if values else None
    except Exception as e:
        results["servicePrincipalSignInActivity"] = _format_graph_error(
            e, "/beta/reports/servicePrincipalSignInActivities"
        )

    # Credential Sign-in Activity (requires Reports.Read.All — application-only)
    try:
        url = (
            f"{GRAPH_BETA}/reports/appCredentialSignInActivities"
            f"?$filter=appId eq '{app_id}'"
        )
        resp = await _graph_request("GET", url, token)
        values = resp.get("value", []) if resp else []
        results["appCredentialSignInActivities"] = values
    except Exception as e:
        results["appCredentialSignInActivities"] = _format_graph_error(
            e, "/beta/reports/appCredentialSignInActivities"
        )

    return results


# ---------------------------------------------------------------------------
# Service principal enable/disable (v1.0 — stable)
# ---------------------------------------------------------------------------

async def disable_service_principal(service_principal_id: str) -> None:
    """Disable a service principal by setting accountEnabled to false."""
    token = await _get_graph_token()
    await retry_with_backoff(
        lambda: _graph_request(
            "PATCH",
            f"{GRAPH_V1}/servicePrincipals/{service_principal_id}",
            token,
            json_body={"accountEnabled": False},
        ),
        max_retries=2,
    )
    logger.info(f"Disabled service principal {service_principal_id}")


async def enable_service_principal(service_principal_id: str) -> None:
    """Re-enable a service principal by setting accountEnabled to true."""
    token = await _get_graph_token()
    await retry_with_backoff(
        lambda: _graph_request(
            "PATCH",
            f"{GRAPH_V1}/servicePrincipals/{service_principal_id}",
            token,
            json_body={"accountEnabled": True},
        ),
        max_retries=2,
    )
    logger.info(f"Enabled service principal {service_principal_id}")
