from __future__ import annotations

from datetime import UTC, datetime

WORK_ORDER_TRANSITIONS = {
    "draft": {"scheduled", "cancelled"},
    "scheduled": {"in_progress", "cancelled"},
    "in_progress": {"quality_check", "cancelled"},
    "quality_check": {"in_progress", "ready"},
    "ready": {"delivered", "in_progress"},
    "delivered": set(),
    "cancelled": set(),
}

WARRANTY_CLAIM_TRANSITIONS = {
    "submitted": {"under_review", "cancelled"},
    "under_review": {"approved", "rejected", "cancelled"},
    "approved": {"resolved", "cancelled"},
    "rejected": {"under_review"},
    "resolved": set(),
    "cancelled": set(),
}


def can_transition_work_order(current: str, target: str) -> bool:
    return target in WORK_ORDER_TRANSITIONS.get(current, set())


def can_transition_warranty_claim(current: str, target: str) -> bool:
    return target in WARRANTY_CLAIM_TRANSITIONS.get(current, set())


def next_order_number(sequence: int, now: datetime | None = None) -> str:
    reference = now or datetime.now(UTC)
    return f"7F-{reference:%Y%m}-{sequence:05d}"
