"""In-memory pub/sub for streaming scan progress events via SSE."""

import asyncio
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ScanEvent:
    type: str  # log, phase_start, phase_complete, progress, error, complete, failed
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    phase: Optional[str] = None
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class ScanEventBus:
    """Per-scan event bus that buffers history and fans out to SSE subscribers."""

    _active: dict[str, "ScanEventBus"] = {}

    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self._subscribers: list[asyncio.Queue] = []
        self._history: list[ScanEvent] = []
        self._done = False

    @classmethod
    def create(cls, scan_id: str) -> "ScanEventBus":
        bus = cls(scan_id)
        cls._active[scan_id] = bus
        return bus

    @classmethod
    def get(cls, scan_id: str) -> Optional["ScanEventBus"]:
        return cls._active.get(scan_id)

    @classmethod
    def get_active_scan_id(cls) -> Optional[str]:
        """Return the scan_id of any currently running (non-done) scan."""
        for scan_id, bus in cls._active.items():
            if not bus._done:
                return scan_id
        return None

    def subscribe(self) -> asyncio.Queue:
        """Subscribe to events. Returns a queue pre-loaded with history."""
        q: asyncio.Queue = asyncio.Queue()
        for event in self._history:
            q.put_nowait(event)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def emit(self, event_type: str, message: str, phase: str | None = None, **data):
        event = ScanEvent(type=event_type, message=message, phase=phase, data=data)
        self._history.append(event)
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    async def close(self):
        """Signal all subscribers that the stream is done, schedule cleanup."""
        self._done = True
        for q in self._subscribers:
            try:
                q.put_nowait(None)  # sentinel
            except asyncio.QueueFull:
                pass
        # Keep bus alive for 5 minutes so late-arriving clients can replay history
        try:
            loop = asyncio.get_running_loop()
            loop.call_later(300, lambda: self._active.pop(self.scan_id, None))
        except RuntimeError:
            self._active.pop(self.scan_id, None)

    @property
    def done(self) -> bool:
        return self._done
