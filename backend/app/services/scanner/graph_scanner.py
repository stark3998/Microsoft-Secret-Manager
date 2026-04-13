import logging
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential
from msgraph import GraphServiceClient

from app.services.expiration import compute_expiration_status

logger = logging.getLogger(__name__)


async def scan_app_registrations(
    credential: DefaultAzureCredential,
    scan_run_id: str,
    tiers: list[dict] | None = None,
) -> tuple[list[dict], int]:
    """Scan all App Registrations for client secrets and certificates.

    Returns (items, app_count).
    """
    graph_client = GraphServiceClient(credential)
    items = []
    app_count = 0

    try:
        # Get all applications
        result = await graph_client.applications.get()
        applications = result.value if result else []

        while True:
            for app in applications:
                app_count += 1
                app_id = app.app_id or ""
                object_id = app.id or ""
                display_name = app.display_name or ""

                # Process password credentials (client secrets)
                for cred in (app.password_credentials or []):
                    expires_on = cred.end_date_time
                    status, days = compute_expiration_status(expires_on, tiers)

                    item_id = f"appreg-secret-{object_id}-{cred.key_id}"
                    items.append({
                        "id": item_id,
                        "partitionKey": "entra",
                        "itemType": "client_secret",
                        "source": "app_registration",
                        "appObjectId": object_id,
                        "appId": app_id,
                        "appDisplayName": display_name,
                        "credentialId": str(cred.key_id) if cred.key_id else "",
                        "credentialDisplayName": cred.display_name or "",
                        "expiresOn": expires_on.isoformat() if expires_on else None,
                        "createdOn": cred.start_date_time.isoformat() if cred.start_date_time else None,
                        "expirationStatus": status,
                        "daysUntilExpiration": days,
                        "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                        "scanRunId": scan_run_id,
                    })

                # Process key credentials (certificates)
                for cred in (app.key_credentials or []):
                    expires_on = cred.end_date_time
                    status, days = compute_expiration_status(expires_on, tiers)

                    item_id = f"appreg-cert-{object_id}-{cred.key_id}"
                    items.append({
                        "id": item_id,
                        "partitionKey": "entra",
                        "itemType": "certificate",
                        "source": "app_registration",
                        "appObjectId": object_id,
                        "appId": app_id,
                        "appDisplayName": display_name,
                        "credentialId": str(cred.key_id) if cred.key_id else "",
                        "credentialDisplayName": cred.display_name or "",
                        "expiresOn": expires_on.isoformat() if expires_on else None,
                        "createdOn": cred.start_date_time.isoformat() if cred.start_date_time else None,
                        "thumbprint": cred.custom_key_identifier.hex() if cred.custom_key_identifier else None,
                        "expirationStatus": status,
                        "daysUntilExpiration": days,
                        "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                        "scanRunId": scan_run_id,
                    })

            # Handle pagination
            if hasattr(result, 'odata_next_link') and result.odata_next_link:
                result = await graph_client.applications.with_url(result.odata_next_link).get()
                applications = result.value if result else []
            else:
                break

    except Exception as e:
        logger.exception(f"Error scanning app registrations: {e}")

    logger.info(f"Scanned {app_count} app registrations, found {len(items)} credentials")
    return items, app_count


async def scan_enterprise_apps(
    credential: DefaultAzureCredential,
    scan_run_id: str,
    tiers: list[dict] | None = None,
) -> tuple[list[dict], int, dict[str, dict]]:
    """Scan Enterprise Applications (Service Principals) for SAML/signing certificates.

    Returns (items, app_count, sp_metadata).
    sp_metadata maps appId -> {servicePrincipalId, accountEnabled, displayName}.
    """
    graph_client = GraphServiceClient(credential)
    items = []
    app_count = 0
    sp_metadata: dict[str, dict] = {}

    try:
        result = await graph_client.service_principals.get()
        service_principals = result.value if result else []

        while True:
            for sp in service_principals:
                app_count += 1
                sp_id = sp.id or ""
                app_id = sp.app_id or ""
                display_name = sp.display_name or ""
                account_enabled = sp.account_enabled if sp.account_enabled is not None else True

                # Collect SP metadata for inventory
                if app_id:
                    sp_metadata[app_id] = {
                        "servicePrincipalId": sp_id,
                        "accountEnabled": account_enabled,
                        "displayName": display_name,
                    }

                # Process key credentials (certificates)
                # Track keyIds so we can skip password_credentials that are
                # just the associated password for an uploaded certificate
                cert_key_ids: set[str] = set()
                for cred in (sp.key_credentials or []):
                    expires_on = cred.end_date_time
                    status, days = compute_expiration_status(expires_on, tiers)
                    key_id_str = str(cred.key_id) if cred.key_id else ""
                    if key_id_str:
                        cert_key_ids.add(key_id_str)

                    item_id = f"entapp-cert-{sp_id}-{cred.key_id}"
                    items.append({
                        "id": item_id,
                        "partitionKey": "entra",
                        "itemType": "saml_certificate",
                        "source": "enterprise_app",
                        "servicePrincipalId": sp_id,
                        "appId": app_id,
                        "appDisplayName": display_name,
                        "accountEnabled": account_enabled,
                        "credentialId": key_id_str,
                        "certType": cred.usage or "",
                        "thumbprint": cred.custom_key_identifier.hex() if cred.custom_key_identifier else "",
                        "subject": cred.display_name or "",
                        "expiresOn": expires_on.isoformat() if expires_on else None,
                        "createdOn": cred.start_date_time.isoformat() if cred.start_date_time else None,
                        "expirationStatus": status,
                        "daysUntilExpiration": days,
                        "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                        "scanRunId": scan_run_id,
                    })

                # Process password credentials — skip any whose keyId matches
                # a key_credential (certificate), as those are just the cert's
                # associated password, not standalone client secrets
                for cred in (sp.password_credentials or []):
                    key_id_str = str(cred.key_id) if cred.key_id else ""
                    if key_id_str in cert_key_ids:
                        continue

                    expires_on = cred.end_date_time
                    status, days = compute_expiration_status(expires_on, tiers)

                    item_id = f"entapp-secret-{sp_id}-{cred.key_id}"
                    items.append({
                        "id": item_id,
                        "partitionKey": "entra",
                        "itemType": "client_secret",
                        "source": "enterprise_app",
                        "servicePrincipalId": sp_id,
                        "appId": app_id,
                        "appDisplayName": display_name,
                        "accountEnabled": account_enabled,
                        "credentialId": key_id_str,
                        "credentialDisplayName": cred.display_name or "",
                        "expiresOn": expires_on.isoformat() if expires_on else None,
                        "createdOn": cred.start_date_time.isoformat() if cred.start_date_time else None,
                        "expirationStatus": status,
                        "daysUntilExpiration": days,
                        "lastScannedAt": datetime.now(timezone.utc).isoformat(),
                        "scanRunId": scan_run_id,
                    })

            if hasattr(result, 'odata_next_link') and result.odata_next_link:
                result = await graph_client.service_principals.with_url(result.odata_next_link).get()
                service_principals = result.value if result else []
            else:
                break

    except Exception as e:
        logger.exception(f"Error scanning enterprise apps: {e}")

    logger.info(f"Scanned {app_count} enterprise apps, found {len(items)} credentials")
    return items, app_count, sp_metadata
