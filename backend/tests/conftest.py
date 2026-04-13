import os
import pytest

# Ensure tests run in local storage mode without auth
os.environ.setdefault("STORAGE_MODE", "local")
os.environ.setdefault("AUTH_DISABLED", "true")
os.environ.setdefault("LOCAL_DATA_DIR", "./test_data")


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def sample_keyvault_item():
    """A sample Key Vault item document."""
    return {
        "id": "kv-secret-sub1-vault1-mysecret",
        "partitionKey": "sub-123",
        "itemType": "secret",
        "source": "keyvault",
        "subscriptionId": "sub-123",
        "subscriptionName": "Test Subscription",
        "resourceGroup": "rg-test",
        "vaultName": "vault1",
        "vaultUri": "https://vault1.vault.azure.net",
        "itemName": "mysecret",
        "itemVersion": "",
        "enabled": True,
        "expiresOn": "2026-06-01T00:00:00Z",
        "expirationStatus": "notice",
        "daysUntilExpiration": 52,
        "lastScannedAt": "2026-04-11T00:00:00Z",
    }


@pytest.fixture
def sample_app_registration():
    """A sample App Registration credential document."""
    return {
        "id": "ar-myapp-client_secret-cred1",
        "partitionKey": "entra",
        "itemType": "client_secret",
        "source": "app_registration",
        "appObjectId": "obj-123",
        "appId": "app-123",
        "appDisplayName": "My App",
        "credentialId": "cred-123",
        "credentialDisplayName": "Credential 1",
        "expiresOn": "2026-03-01T00:00:00Z",
        "expirationStatus": "expired",
        "daysUntilExpiration": -41,
    }
