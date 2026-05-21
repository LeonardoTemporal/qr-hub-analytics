"""
Router de analiticas - Dashboard empresarial.

Endpoints especializados (todos protegidos con HTTP Basic Auth):

    GET /api/analytics/summary/{campaign_id}
        KPIs: total_scans, recent_scans_7d, daily_avg, unique_devices, unique_countries

    GET /api/analytics/distribution/{campaign_id}
        Distribuciones para donut charts: devices, os, browsers

    GET /api/analytics/location/{campaign_id}
        Top paises, estados (subdivisiones) y ciudades / municipios

    GET /api/analytics/timeline/{campaign_id}?range=7d|30d|12m|hoy
        Serie de tiempo agrupada por dia, mes u hora cuando range=hoy.

Tambien expone el endpoint legacy GET /api/analytics/{campaign_id}
para no romper integraciones existentes durante la transicion.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func, select

from app.auth import require_admin
from app.database import AsyncSessionLocal
from app.models import Scan

logger = logging.getLogger(__name__)
router = APIRouter()

TimeRange = Literal["hoy", "7d", "30d", "12m"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _range_to_start(range_: TimeRange) -> datetime:
    """Convierte el rango logico a timestamp de inicio (UTC naive)."""
    now = datetime.utcnow()
    if range_ == "hoy":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_ == "7d":
        return now - timedelta(days=7)
    if range_ == "12m":
        month = now.month - 11
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        return now.replace(
            year=year,
            month=month,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
    return now - timedelta(days=30)


def _campaign_filters(campaign_id: str | None) -> tuple:
    if campaign_id and campaign_id.lower() != "all":
        return (Scan.campaign_id == campaign_id,)
    return ()


def _campaign_label(campaign_id: str | None) -> str:
    return campaign_id if campaign_id and campaign_id.lower() != "all" else "all"


async def _build_kpis(session, campaign_id: str | None = None) -> dict:
    filters = _campaign_filters(campaign_id)

    total = (
        await session.execute(select(func.count(Scan.id)).where(*filters))
    ).scalar() or 0

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent = (
        await session.execute(
            select(func.count(Scan.id)).where(
                *filters,
                Scan.scanned_at >= seven_days_ago,
            )
        )
    ).scalar() or 0

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    last_30 = (
        await session.execute(
            select(func.count(Scan.id)).where(
                *filters,
                Scan.scanned_at >= thirty_days_ago,
            )
        )
    ).scalar() or 0

    unique_devices = (
        await session.execute(
            select(func.count(distinct(Scan.device_type))).where(
                *filters,
                Scan.device_type.isnot(None),
            )
        )
    ).scalar() or 0

    unique_countries = (
        await session.execute(
            select(func.count(distinct(Scan.country))).where(
                *filters,
                Scan.country.isnot(None),
            )
        )
    ).scalar() or 0

    return {
        "campaign_id": _campaign_label(campaign_id),
        "total_scans": total,
        "recent_scans_7d": recent,
        "scans_30d": last_30,
        "daily_avg": round(last_30 / 30, 2) if last_30 else 0,
        "unique_devices": unique_devices,
        "unique_countries": unique_countries,
    }


async def _name_value_rows(
    session,
    column,
    campaign_id: str | None = None,
    limit: int = 10,
) -> list[dict[str, int | str]]:
    rows = (
        await session.execute(
            select(column.label("name"), func.count(Scan.id).label("count"))
            .where(
                *_campaign_filters(campaign_id),
                column.isnot(None),
            )
            .group_by(column)
            .order_by(func.count(Scan.id).desc())
            .limit(limit)
        )
    ).all()
    return [{"name": row.name or "Unknown", "value": row.count} for row in rows]


async def _build_distribution(session, campaign_id: str | None = None) -> dict:
    return {
        "campaign_id": _campaign_label(campaign_id),
        "devices": await _name_value_rows(session, Scan.device_type, campaign_id),
        "os": await _name_value_rows(session, Scan.os, campaign_id),
        "browsers": await _name_value_rows(session, Scan.browser, campaign_id),
    }


async def _build_geo(session, campaign_id: str | None = None) -> dict:
    cities = await _name_value_rows(session, Scan.city, campaign_id, limit=20)
    return {
        "campaign_id": _campaign_label(campaign_id),
        "countries": await _name_value_rows(session, Scan.country, campaign_id),
        "states": await _name_value_rows(session, Scan.state, campaign_id, limit=20),
        "municipalities": cities,
        "cities": cities,
    }


async def _build_timeline(
    session,
    campaign_id: str | None = None,
    range_: TimeRange = "30d",
) -> dict:
    start = _range_to_start(range_)
    bucket = "hour" if range_ == "hoy" else "month" if range_ == "12m" else "day"

    rows = (
        await session.execute(
            select(
                func.date_trunc(bucket, Scan.scanned_at).label("date"),
                func.count(Scan.id).label("count"),
            )
            .where(
                *_campaign_filters(campaign_id),
                Scan.scanned_at >= start,
            )
            .group_by("date")
            .order_by("date")
        )
    ).all()
    series = [{"date": row.date.isoformat(), "scans": row.count} for row in rows]

    return {
        "campaign_id": _campaign_label(campaign_id),
        "range": range_,
        "bucket": bucket,
        "series": series,
    }


# ---------------------------------------------------------------------------
# Endpoints globales del dashboard Vite
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/kpis",
    summary="KPIs globales del dashboard",
    tags=["analytics"],
)
async def get_kpis(
    _: Annotated[str, Depends(require_admin)],
    campaign_id: str | None = Query(default=None),
):
    async with AsyncSessionLocal() as session:
        return await _build_kpis(session, campaign_id)


@router.get(
    "/analytics/distribution",
    summary="Distribucion global de dispositivos, OS y navegadores",
    tags=["analytics"],
)
async def get_distribution_global(
    _: Annotated[str, Depends(require_admin)],
    campaign_id: str | None = Query(default=None),
):
    async with AsyncSessionLocal() as session:
        return await _build_distribution(session, campaign_id)


@router.get(
    "/analytics/geo",
    summary="Geografia global por pais, estado y municipio",
    tags=["analytics"],
)
async def get_geo(
    _: Annotated[str, Depends(require_admin)],
    campaign_id: str | None = Query(default=None),
):
    async with AsyncSessionLocal() as session:
        return await _build_geo(session, campaign_id)


@router.get(
    "/analytics/timeline",
    summary="Serie temporal global de escaneos",
    tags=["analytics"],
)
async def get_timeline_global(
    _: Annotated[str, Depends(require_admin)],
    campaign_id: str | None = Query(default=None),
    range_: TimeRange = Query("30d", alias="range"),
):
    async with AsyncSessionLocal() as session:
        return await _build_timeline(session, campaign_id, range_)


# ---------------------------------------------------------------------------
# /api/analytics/summary/{campaign_id}
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/summary/{campaign_id}",
    summary="KPIs principales del dashboard",
    tags=["analytics"],
)
async def get_summary(
    campaign_id: str,
    _: Annotated[str, Depends(require_admin)],
):
    async with AsyncSessionLocal() as session:
        return await _build_kpis(session, campaign_id)


# ---------------------------------------------------------------------------
# /api/analytics/distribution/{campaign_id}
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/distribution/{campaign_id}",
    summary="Distribucion de dispositivos, OS y navegadores",
    tags=["analytics"],
)
async def get_distribution(
    campaign_id: str,
    _: Annotated[str, Depends(require_admin)],
):
    async with AsyncSessionLocal() as session:
        return await _build_distribution(session, campaign_id)


# ---------------------------------------------------------------------------
# /api/analytics/location/{campaign_id}
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/location/{campaign_id}",
    summary="Top paises, estados y ciudades / municipios",
    tags=["analytics"],
)
async def get_location(
    campaign_id: str,
    _: Annotated[str, Depends(require_admin)],
):
    async with AsyncSessionLocal() as session:
        return await _build_geo(session, campaign_id)


# ---------------------------------------------------------------------------
# /api/analytics/timeline/{campaign_id}
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/timeline/{campaign_id}",
    summary="Serie de tiempo (escaneos por dia / hora)",
    tags=["analytics"],
)
async def get_timeline(
    campaign_id: str,
    _: Annotated[str, Depends(require_admin)],
    range_: TimeRange = Query("30d", alias="range"),
):
    async with AsyncSessionLocal() as session:
        return await _build_timeline(session, campaign_id, range_)


# ---------------------------------------------------------------------------
# Endpoint legacy combinado (compatibilidad con dashboard previo)
# ---------------------------------------------------------------------------
@router.get(
    "/analytics/{campaign_id}",
    summary="[Legacy] Analiticas combinadas en un solo response",
    tags=["analytics"],
)
async def get_analytics_legacy(
    campaign_id: str,
    _: Annotated[str, Depends(require_admin)],
):
    async with AsyncSessionLocal() as session:
        total = (
            await session.execute(
                select(func.count(Scan.id)).where(Scan.campaign_id == campaign_id)
            )
        ).scalar() or 0

        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent = (
            await session.execute(
                select(func.count(Scan.id)).where(
                    Scan.campaign_id == campaign_id,
                    Scan.scanned_at >= seven_days_ago,
                )
            )
        ).scalar() or 0

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        time_series_rows = (
            await session.execute(
                select(
                    func.date_trunc("day", Scan.scanned_at).label("date"),
                    func.count(Scan.id).label("count"),
                )
                .where(
                    Scan.campaign_id == campaign_id,
                    Scan.scanned_at >= thirty_days_ago,
                )
                .group_by("date")
                .order_by("date")
            )
        ).all()
        time_series = [
            {"date": row.date.isoformat(), "scans": row.count}
            for row in time_series_rows
        ]

        device_rows = (
            await session.execute(
                select(Scan.device_type, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.device_type.isnot(None))
                .group_by(Scan.device_type)
                .order_by(func.count(Scan.id).desc())
            )
        ).all()
        device_distribution = [
            {"name": row.device_type or "Unknown", "value": row.count}
            for row in device_rows
        ]

        os_rows = (
            await session.execute(
                select(Scan.os, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.os.isnot(None))
                .group_by(Scan.os)
                .order_by(func.count(Scan.id).desc())
                .limit(10)
            )
        ).all()
        os_distribution = [
            {"name": row.os or "Unknown", "value": row.count} for row in os_rows
        ]

        browser_rows = (
            await session.execute(
                select(Scan.browser, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.browser.isnot(None))
                .group_by(Scan.browser)
                .order_by(func.count(Scan.id).desc())
                .limit(10)
            )
        ).all()
        browser_distribution = [
            {"name": row.browser or "Unknown", "value": row.count}
            for row in browser_rows
        ]

        countries_rows = (
            await session.execute(
                select(Scan.country, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.country.isnot(None))
                .group_by(Scan.country)
                .order_by(func.count(Scan.id).desc())
                .limit(10)
            )
        ).all()
        top_countries = [
            {"name": row.country or "Unknown", "value": row.count}
            for row in countries_rows
        ]

        states_rows = (
            await session.execute(
                select(Scan.state, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.state.isnot(None))
                .group_by(Scan.state)
                .order_by(func.count(Scan.id).desc())
                .limit(10)
            )
        ).all()
        top_states = [
            {"name": row.state or "Unknown", "value": row.count}
            for row in states_rows
        ]

        cities_rows = (
            await session.execute(
                select(Scan.city, func.count(Scan.id).label("count"))
                .where(Scan.campaign_id == campaign_id, Scan.city.isnot(None))
                .group_by(Scan.city)
                .order_by(func.count(Scan.id).desc())
                .limit(10)
            )
        ).all()
        top_cities = [
            {"name": row.city or "Unknown", "value": row.count} for row in cities_rows
        ]

        return {
            "campaign_id": campaign_id,
            "kpis": {
                "total_scans": total,
                "recent_scans_7d": recent,
            },
            "time_series": time_series,
            "device_distribution": device_distribution,
            "os_distribution": os_distribution,
            "browser_distribution": browser_distribution,
            "top_countries": top_countries,
            "top_states": top_states,
            "top_cities": top_cities,
        }
