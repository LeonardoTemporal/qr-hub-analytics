from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Protocol

MAX_PIN_ATTEMPTS = 5
PIN_LOCK_DURATION = timedelta(minutes=15)


class PinThrottleTarget(Protocol):
    failed_pin_attempts: int
    pin_locked_until: datetime | None


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def is_pin_locked(target: PinThrottleTarget, now: datetime | None = None) -> bool:
    if target.pin_locked_until is None:
        return False
    current = _as_utc(now or datetime.now(UTC))
    return _as_utc(target.pin_locked_until) > current


def register_pin_failure(
    target: PinThrottleTarget,
    now: datetime | None = None,
) -> None:
    current = _as_utc(now or datetime.now(UTC))
    target.failed_pin_attempts = (target.failed_pin_attempts or 0) + 1
    if target.failed_pin_attempts >= MAX_PIN_ATTEMPTS:
        target.pin_locked_until = current + PIN_LOCK_DURATION


def clear_pin_failures(target: PinThrottleTarget) -> None:
    target.failed_pin_attempts = 0
    target.pin_locked_until = None
