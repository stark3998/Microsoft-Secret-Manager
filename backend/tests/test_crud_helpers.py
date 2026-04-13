"""Unit tests for the shared CRUD helpers."""

import pytest
from datetime import datetime, timezone, timedelta

from app.routers._crud_helpers import expiry_info


class TestExpiryInfo:
    """Test the expiry_info helper function."""

    def test_none_input(self):
        result = expiry_info(None)
        assert result["status"] == "no_expiry"
        assert result["days"] is None

    def test_valid_expired_date(self):
        expired = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        result = expiry_info(expired)
        assert result["status"] == "expired"
        assert result["days"] < 0

    def test_valid_future_date(self):
        future = (datetime.now(timezone.utc) + timedelta(days=200)).isoformat()
        result = expiry_info(future)
        assert result["status"] == "healthy"
        assert result["days"] > 90

    def test_critical_date(self):
        soon = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        result = expiry_info(soon)
        assert result["status"] == "critical"
        assert 0 <= result["days"] <= 7
