from typing import Any

from azure.cosmos.aio import ContainerProxy


async def query_items(
    container: ContainerProxy,
    query: str,
    parameters: list[dict[str, Any]] | None = None,
    partition_key: str | None = None,
    max_items: int | None = None,
) -> list[dict]:
    """Execute a Cosmos DB SQL query and return all results."""
    kwargs: dict[str, Any] = {"query": query}
    if parameters:
        kwargs["parameters"] = parameters
    if partition_key is not None:
        kwargs["partition_key"] = partition_key
    if max_items is not None:
        kwargs["max_item_count"] = max_items

    results = []
    async for item in container.query_items(**kwargs):
        results.append(item)
    return results


async def count_items(
    container: ContainerProxy,
    query: str,
    parameters: list[dict[str, Any]] | None = None,
) -> int:
    """Execute a COUNT query and return the result."""
    kwargs: dict[str, Any] = {"query": query}
    if parameters:
        kwargs["parameters"] = parameters

    results = []
    async for item in container.query_items(**kwargs):
        results.append(item)

    if not results:
        return 0
    # SELECT VALUE COUNT(1) returns a raw integer
    if isinstance(results[0], (int, float)):
        return int(results[0])
    # SELECT COUNT(1) returns {"$1": N}
    if isinstance(results[0], dict) and "$1" in results[0]:
        return results[0]["$1"]
    return 0


async def upsert_item(container: ContainerProxy, item: dict) -> dict:
    """Upsert a single item into a container."""
    return await container.upsert_item(body=item)


async def upsert_items_batch(container: ContainerProxy, items: list[dict]) -> int:
    """Upsert multiple items. Returns the count of upserted items."""
    count = 0
    for item in items:
        await container.upsert_item(body=item)
        count += 1
    return count
