from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.models import AdminUser, AnalyticsEvent, Conversion, Scan, ScanSession

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


def _range_start(range_key: str) -> datetime | None:
    now = datetime.now(UTC)
    return {
        "7d": now - timedelta(days=7),
        "30d": now - timedelta(days=30),
        "12m": now - timedelta(days=365),
        "all": None,
    }[range_key]


def _after(column, start: datetime | None):
    return column >= start if start else True


@router.get("/summary")
async def summary(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    range_key: str = Query("30d", alias="range", pattern="^(7d|30d|12m|all)$"),
) -> dict:
    start = _range_start(range_key)
    sessions = await session.scalar(
        select(func.count(ScanSession.id)).where(_after(ScanSession.created_at, start))
    ) or 0
    events = await session.scalar(
        select(func.count(AnalyticsEvent.id)).where(
            _after(AnalyticsEvent.occurred_at, start)
        )
    ) or 0
    conversions = await session.scalar(
        select(func.count(Conversion.id)).where(_after(Conversion.occurred_at, start))
    ) or 0
    return {"scan_sessions": sessions, "events": events, "conversions": conversions}


@router.get("/funnel")
async def funnel(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    range_key: str = Query("30d", alias="range", pattern="^(7d|30d|12m|all)$"),
) -> dict:
    start = _range_start(range_key)
    rows = (
        await session.execute(
            select(AnalyticsEvent.event_type, func.count(AnalyticsEvent.id))
            .where(_after(AnalyticsEvent.occurred_at, start))
            .group_by(AnalyticsEvent.event_type)
            .order_by(func.count(AnalyticsEvent.id).desc())
        )
    ).all()
    return {"steps": [{"event_type": name, "value": count} for name, count in rows]}


@router.get("/timeline")
async def timeline(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    range_key: str = Query("30d", alias="range", pattern="^(7d|30d|12m|all)$"),
) -> dict:
    start = _range_start(range_key)
    grain = "month" if range_key in {"12m", "all"} else "day"
    bucket = func.date_trunc(grain, ScanSession.created_at).label("bucket")
    rows = (
        await session.execute(
            select(bucket, func.count(ScanSession.id))
            .where(_after(ScanSession.created_at, start))
            .group_by(bucket)
            .order_by(bucket)
        )
    ).all()
    return {
        "grain": grain,
        "series": [
            {"date": value.isoformat(), "scans": count} for value, count in rows
        ],
    }


@router.get("/sources")
async def sources(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    range_key: str = Query("30d", alias="range", pattern="^(7d|30d|12m|all)$"),
) -> dict:
    start = _range_start(range_key)
    rows = (
        await session.execute(
            select(Scan.campaign_id, func.count(ScanSession.id))
            .join(ScanSession, ScanSession.scan_id == Scan.id)
            .where(_after(ScanSession.created_at, start))
            .group_by(Scan.campaign_id)
            .order_by(func.count(ScanSession.id).desc())
        )
    ).all()
    return {"sources": [{"name": name, "value": count} for name, count in rows]}
