from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AnalyticsEvent, ScanSession

router = APIRouter(prefix="/tracking", tags=["tracking"])


class TrackingEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    path: str | None = Field(default=None, max_length=255)
    element_id: str | None = Field(default=None, max_length=120)
    idempotency_key: str | None = Field(default=None, max_length=120)
    metadata: dict | None = None


@router.post("/events", status_code=202)
async def collect_event(
    payload: TrackingEventRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    qr_attribution: Annotated[str | None, Cookie()] = None,
) -> dict[str, bool]:
    if not qr_attribution:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Atribucion QR requerida")
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
            idempotency_key=payload.idempotency_key,
            event_metadata=payload.metadata,
        )
    )
    scan_session.last_event_at = datetime.now(UTC)
    await session.commit()
    return {"accepted": True}
