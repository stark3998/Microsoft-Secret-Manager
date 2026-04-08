from datetime import datetime, timezone

from app.models.common import ExpirationStatus


# Default thresholds (overridden by settings from Cosmos DB)
DEFAULT_TIERS = [
    {"name": "critical", "daysBeforeExpiry": 7},
    {"name": "warning", "daysBeforeExpiry": 30},
    {"name": "notice", "daysBeforeExpiry": 90},
]


def compute_expiration_status(
    expires_on: datetime | None,
    tiers: list[dict] | None = None,
) -> tuple[str, int | None]:
    """Compute expiration status and days until expiration.

    Returns (status, days_until_expiration).
    """
    if expires_on is None:
        return ExpirationStatus.NO_EXPIRY, None

    now = datetime.now(timezone.utc)
    if expires_on.tzinfo is None:
        expires_on = expires_on.replace(tzinfo=timezone.utc)

    delta = expires_on - now
    days = delta.days

    if days < 0:
        return ExpirationStatus.EXPIRED, days

    tiers = tiers or DEFAULT_TIERS
    # Sort tiers by daysBeforeExpiry ascending so we match the tightest threshold first
    sorted_tiers = sorted(tiers, key=lambda t: t["daysBeforeExpiry"])

    for tier in sorted_tiers:
        if days <= tier["daysBeforeExpiry"]:
            return tier["name"], days

    return ExpirationStatus.HEALTHY, days


def compute_status_for_doc(doc: dict, tiers: list[dict] | None = None) -> dict:
    """Update a Cosmos document with computed expiration fields."""
    expires_on_str = doc.get("expiresOn")
    expires_on = None
    if expires_on_str:
        expires_on = datetime.fromisoformat(expires_on_str)

    status, days = compute_expiration_status(expires_on, tiers)
    doc["expirationStatus"] = status
    doc["daysUntilExpiration"] = days
    return doc
