from __future__ import annotations

import asyncio

from app.services.rate_limit_service import SlidingWindowRateLimiter


def test_sliding_window_rejects_requests_over_limit() -> None:
    limiter = SlidingWindowRateLimiter(clock=lambda: 100.0)

    assert asyncio.run(
        limiter.allow("client", limit=2, window_seconds=60)
    )
    assert asyncio.run(
        limiter.allow("client", limit=2, window_seconds=60)
    )
    assert not asyncio.run(
        limiter.allow("client", limit=2, window_seconds=60)
    )


def test_sliding_window_allows_requests_after_window() -> None:
    clock = iter((100.0, 100.0, 161.0))
    limiter = SlidingWindowRateLimiter(clock=lambda: next(clock))

    assert asyncio.run(
        limiter.allow("client", limit=1, window_seconds=60)
    )
    assert not asyncio.run(
        limiter.allow("client", limit=1, window_seconds=60)
    )
    assert asyncio.run(
        limiter.allow("client", limit=1, window_seconds=60)
    )
