import asyncio
import logging

from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import SubscriptionClient

logger = logging.getLogger(__name__)


async def enumerate_subscriptions(
    credential: DefaultAzureCredential,
    subscription_filter: list[str] | None = None,
) -> list[dict]:
    """Enumerate all Azure subscriptions accessible with the given credential.

    Returns a list of dicts with subscriptionId and displayName.
    If subscription_filter is provided, only returns matching subscription IDs.
    """
    def _list_subscriptions_sync(credential, subscription_filter):
        client = SubscriptionClient(credential)
        subscriptions = []
        for sub in client.subscriptions.list():
            if subscription_filter and sub.subscription_id not in subscription_filter:
                continue
            subscriptions.append({
                "subscriptionId": sub.subscription_id,
                "displayName": sub.display_name,
                "state": sub.state,
            })
        return subscriptions

    subscriptions = await asyncio.to_thread(_list_subscriptions_sync, credential, subscription_filter)

    logger.info(f"Found {len(subscriptions)} subscriptions")
    return subscriptions
