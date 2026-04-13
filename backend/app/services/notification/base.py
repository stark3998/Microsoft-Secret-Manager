"""Abstract base class for notification senders."""

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class NotificationSender(ABC):
    """Base class for all notification channel senders."""

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Human-readable channel name for logging."""
        ...

    @abstractmethod
    async def send(
        self,
        expired: list[dict],
        critical: list[dict],
        warning: list[dict],
        settings: dict,
    ) -> None:
        """Send a notification with the given items."""
        ...

    def is_enabled(self, settings: dict) -> bool:
        """Check if this channel is enabled in the given settings."""
        return False

    async def try_send(
        self,
        expired: list[dict],
        critical: list[dict],
        warning: list[dict],
        settings: dict,
    ) -> bool:
        """Attempt to send, logging any errors. Returns True on success."""
        if not self.is_enabled(settings):
            return False
        try:
            await self.send(expired, critical, warning, settings)
            logger.info(f"{self.channel_name} notification sent successfully")
            return True
        except Exception as e:
            logger.exception(f"Failed to send {self.channel_name} notification: {e}")
            return False
