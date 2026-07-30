from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import AnalyticsEvent, ScanSession
from app.services.proxy_service import is_trusted_internal_proxy
from app.services.rate_limit_service import SlidingWindowRateLimiter

router = APIRouter(prefix="/tracking", tags=["tracking"])
_event_rate_limiter = SlidingWindowRateLimiter()

TrackingEventType = Literal[
    "destination_view",
    "cta_click",
    "link_click",
    "lead_submit",
    "portal_open",
]


class TrackingEventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: TrackingEventType
    path: str | None = Field(default=None, max_length=255, pattern=r"^/")
    element_id: str | None = Field(
        default=None,
        max_length=120,
        pattern=r"^[A-Za-z0-9_.:-]+$",
    )
    idempotency_key: UUID
    metadata: dict | None = None

    @field_validator("metadata")
    @classmethod
    def limit_metadata_size(cls, value: dict | None) -> dict | None:
        if value is None:
            return None
        encoded = json.dumps(value, separators=(",", ":"), ensure_ascii=True)
        if len(encoded.encode("utf-8")) > 2_048:
            raise ValueError("metadata exceeds 2048 bytes")
        return value


@router.post("/events", status_code=202)
async def collect_event(
    payload: TrackingEventRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    qr_attribution: Annotated[str | None, Cookie()] = None,
) -> dict[str, bool]:
    if not qr_attribution:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Atribucion QR requerida")
    if not is_trusted_internal_proxy(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trusted proxy required",
        )
    attribution_digest = hashlib.sha256(qr_attribution.encode("utf-8")).hexdigest()
    if not await _event_rate_limiter.allow(
        f"tracking-event:{attribution_digest}",
        limit=settings.TRACKING_EVENT_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many tracking events",
            headers={"Retry-After": "60"},
        )
    scan_session = (
        await session.execute(
            select(ScanSession).where(
                ScanSession.attribution_token == qr_attribution,
                ScanSession.expires_at > datetime.now(UTC),
            )
        )
    ).scalar_one_or_none()
    if not scan_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Atribucion QR invalida")

    session.add(
        AnalyticsEvent(
            scan_session_id=scan_session.id,
            event_type=payload.event_type,
            path=payload.path,
            element_id=payload.element_id,
            idempotency_key=str(payload.idempotency_key),
            event_metadata=payload.metadata,
        )
    )
    scan_session.last_event_at = datetime.now(UTC)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
    return {"accepted": True}
