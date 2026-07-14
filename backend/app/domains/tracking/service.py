from __future__ import annotations

from datetime import UTC, datetime, timedelta

ATTRIBUTION_DAYS = 30


def attribution_expires_at(now: datetime | None = None) -> datetime:
    reference = now or datetime.now(UTC)
    return reference + timedelta(days=ATTRIBUTION_DAYS)
