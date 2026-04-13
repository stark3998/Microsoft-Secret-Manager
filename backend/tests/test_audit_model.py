"""Unit tests for audit log model."""

from app.models.audit import AuditLogEntry, AuditAction


class TestAuditLogEntry:
    def test_to_cosmos_doc(self):
        entry = AuditLogEntry(
            id="test-id",
            action=AuditAction.SCAN_TRIGGERED,
            resource_type="scan",
            resource_id="scan-123",
            resource_name="Full scan",
            user_id="user-1",
            user_name="Test User",
            user_email="test@example.com",
            timestamp="2026-01-01T00:00:00Z",
            details={"trigger": "manual"},
        )
        doc = entry.to_cosmos_doc()
        assert doc["id"] == "test-id"
        assert doc["partitionKey"] == AuditAction.SCAN_TRIGGERED
        assert doc["action"] == AuditAction.SCAN_TRIGGERED
        assert doc["resourceType"] == "scan"
        assert doc["userId"] == "user-1"
        assert doc["details"]["trigger"] == "manual"

    def test_audit_actions_are_strings(self):
        assert str(AuditAction.SCAN_TRIGGERED) == "scan.triggered"
        assert str(AuditAction.ITEM_CREATED) == "item.created"
        assert str(AuditAction.SETTINGS_UPDATED) == "settings.updated"
