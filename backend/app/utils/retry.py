import asyncio
import logging
import random

logger = logging.getLogger(__name__)


async def retry_with_backoff(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    retriable_exceptions: tuple = (Exception,),
):
    """Execute an async function with exponential backoff and optional jitter.

    Args:
        func: Async callable to execute.
        max_retries: Maximum number of retry attempts.
        base_delay: Initial delay in seconds.
        max_delay: Maximum delay cap in seconds.
        jitter: Add random jitter to prevent thundering herd.
        retriable_exceptions: Tuple of exception types to retry on.
    """
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except retriable_exceptions as e:
            last_exception = e
            if attempt == max_retries:
                break
            delay = min(base_delay * (2 ** attempt), max_delay)
            if jitter:
                delay = delay * (0.5 + random.random())
            logger.warning(
                f"Retry {attempt + 1}/{max_retries} after {delay:.1f}s: {e}"
            )
            await asyncio.sleep(delay)
    raise last_exception


def add_throttle_jitter(max_jitter_seconds: int = 600) -> float:
    """Generate a random jitter delay for API throttling avoidance.

    Used before batch operations to spread load across time.
    Returns the jitter in seconds.
    """
    return random.uniform(0, max_jitter_seconds)
