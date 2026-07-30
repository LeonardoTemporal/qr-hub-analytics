from __future__ import annotations

import asyncio
from collections import OrderedDict, deque
from collections.abc import Callable
from time import monotonic


class SlidingWindowRateLimiter:
    """Rate limiter local, acotado y seguro para endpoints públicos ligeros."""

    def __init__(
        self,
        max_keys: int = 20_000,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self._max_keys = max_keys
        self._clock = clock
        self._buckets: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = asyncio.Lock()

    async def allow(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: float,
    ) -> bool:
        if limit <= 0 or window_seconds <= 0:
            return False

        now = self._clock()
        cutoff = now - window_seconds
        async with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            self._buckets.move_to_end(key)
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                return False

            bucket.append(now)
            while len(self._buckets) > self._max_keys:
                self._buckets.popitem(last=False)
            return True
