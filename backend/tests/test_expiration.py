"""Unit tests for the expiration status computation logic."""

import pytest
from datetime import datetime, timezone, timedelta

from app.services.expiration import compute_expiration_status


class TestComputeExpirationStatus:
    """Test expiration status computation with various date scenarios."""

    def test_none_date_returns_no_expiry(self):
        """When no expiration date is set, return no_expiry."""
        status, days = compute_expiration_status(None)
        assert status == "no_expiry"
        assert days is None

    def test_expired_item(self):
        """An item that expired yesterday should be 'expired'."""
        expired_date = datetime.now(timezone.utc) - timedelta(days=5)
        status, days = compute_expiration_status(expired_date)
        assert status == "expired"
        assert days < 0

    def test_expires_today(self):
        """An item expiring today (0 days) should be 'critical'."""
        today = datetime.now(timezone.utc) + timedelta(hours=1)
        status, days = compute_expiration_status(today)
        assert status == "critical"
        assert days >= 0

    def test_critical_threshold(self):
        """An item expiring within 7 days should be 'critical'."""
        date = datetime.now(timezone.utc) + timedelta(days=3)
        status, days = compute_expiration_status(date)
        assert status == "critical"
        assert 0 <= days <= 7

    def test_warning_threshold(self):
        """An item expiring within 30 days (but >7) should be 'warning'."""
        date = datetime.now(timezone.utc) + timedelta(days=20)
        status, days = compute_expiration_status(date)
        assert status == "warning"
        assert 7 < days <= 30

    def test_notice_threshold(self):
        """An item expiring within 90 days (but >30) should be 'notice'."""
        date = datetime.now(timezone.utc) + timedelta(days=60)
        status, days = compute_expiration_status(date)
        assert status == "notice"
        assert 30 < days <= 90

    def test_healthy_item(self):
        """An item with >90 days left should be 'healthy'."""
        date = datetime.now(timezone.utc) + timedelta(days=365)
        status, days = compute_expiration_status(date)
        assert status == "healthy"
        assert days > 90

    def test_custom_tiers(self):
        """Test with custom threshold tiers."""
        custom_tiers = [
            {"name": "critical", "daysBeforeExpiry": 14},
            {"name": "warning", "daysBeforeExpiry": 60},
            {"name": "notice", "daysBeforeExpiry": 180},
        ]
        date = datetime.now(timezone.utc) + timedelta(days=10)
        status, days = compute_expiration_status(date, custom_tiers)
        assert status == "critical"

        date2 = datetime.now(timezone.utc) + timedelta(days=45)
        status2, days2 = compute_expiration_status(date2, custom_tiers)
        assert status2 == "warning"

    def test_far_expired_item(self):
        """An item that expired a long time ago."""
        long_ago = datetime.now(timezone.utc) - timedelta(days=365)
        status, days = compute_expiration_status(long_ago)
        assert status == "expired"
        assert days < -300
