"""
Router de analiticas - Dashboard empresarial.

Endpoints especializados (todos protegidos con HTTP Basic Auth):

    GET /api/analytics/summary/{campaign_id}
        KPIs: total_scans, recent_scans_7d, daily_avg, unique_devices, unique_countries

    GET /api/analytics/distribution/{campaign_id}
        Distribuciones para donut charts: devices, os, browsers

    GET /api/analytics/location/{campaign_id}
        Top paises, estados (subdivisiones) y ciudades / municipios

    GET /api/analytics/timeline/{campaign_id}?range=7d|30d|hoy
        Serie de tiempo agrupada por dia (o por hora cuando range=hoy)

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

TimeRange = Literal["hoy", "7d", "30d"]


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
    return now - timedelta(days=30)


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
        total_q = select(func.count(Scan.id)).where(Scan.campaign_id == campaign_id)
        total = (await session.execute(total_q)).scalar() or 0

        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_q = select(func.count(Scan.id)).where(
            Scan.campaign_id == campaign_id,
            Scan.scanned_at >= seven_days_ago,
        )
        recent = (await session.execute(recent_q)).scalar() or 0

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        last_30_q = select(func.count(Scan.id)).where(
            Scan.campaign_id == campaign_id,
            Scan.scanned_at >= thirty_days_ago,
        )
        last_30 = (await session.execute(last_30_q)).scalar() or 0

        unique_devices_q = select(
            func.count(distinct(Scan.device_type))
        ).where(Scan.campaign_id == campaign_id, Scan.device_type.isnot(None))
        unique_devices = (await session.execute(unique_devices_q)).scalar() or 0

        unique_countries_q = select(
            func.count(distinct(Scan.country))
        ).where(Scan.campaign_id == campaign_id, Scan.country.isnot(None))
        unique_countries = (await session.execute(unique_countries_q)).scalar() or 0

        daily_avg = round(last_30 / 30, 2) if last_30 else 0

        return {
            "campaign_id": campaign_id,
            "total_scans": total,
            "recent_scans_7d": recent,
            "scans_30d": last_30,
            "daily_avg": daily_avg,
            "unique_devices": unique_devices,
            "unique_countries": unique_countries,
        }


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
        device_q = (
            select(Scan.device_type, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.device_type.isnot(None))
            .group_by(Scan.device_type)
            .order_by(func.count(Scan.id).desc())
        )
        device_rows = (await session.execute(device_q)).all()
        devices = [
            {"name": row.device_type or "Unknown", "value": row.count}
            for row in device_rows
        ]

        os_q = (
            select(Scan.os, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.os.isnot(None))
            .group_by(Scan.os)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )
        os_rows = (await session.execute(os_q)).all()
        os_list = [
            {"name": row.os or "Unknown", "value": row.count} for row in os_rows
        ]

        browser_q = (
            select(Scan.browser, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.browser.isnot(None))
            .group_by(Scan.browser)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )
        browser_rows = (await session.execute(browser_q)).all()
        browsers = [
            {"name": row.browser or "Unknown", "value": row.count}
            for row in browser_rows
        ]

        return {
            "campaign_id": campaign_id,
            "devices": devices,
            "os": os_list,
            "browsers": browsers,
        }


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
        countries_q = (
            select(Scan.country, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.country.isnot(None))
            .group_by(Scan.country)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )
        countries_rows = (await session.execute(countries_q)).all()
        countries = [
            {"name": row.country or "Unknown", "value": row.count}
            for row in countries_rows
        ]

        states_q = (
            select(Scan.state, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.state.isnot(None))
            .group_by(Scan.state)
            .order_by(func.count(Scan.id).desc())
            .limit(20)
        )
        states_rows = (await session.execute(states_q)).all()
        states = [
            {"name": row.state or "Unknown", "value": row.count}
            for row in states_rows
        ]

        cities_q = (
            select(Scan.city, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.city.isnot(None))
            .group_by(Scan.city)
            .order_by(func.count(Scan.id).desc())
            .limit(20)
        )
        cities_rows = (await session.execute(cities_q)).all()
        cities = [
            {"name": row.city or "Unknown", "value": row.count} for row in cities_rows
        ]

        return {
            "campaign_id": campaign_id,
            "countries": countries,
            "states": states,
            "cities": cities,
        }


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
    start = _range_to_start(range_)

    # 'hoy' agrupa por hora; 7d / 30d agrupan por dia.
    bucket = "hour" if range_ == "hoy" else "day"

    async with AsyncSessionLocal() as session:
        q = (
            select(
                func.date_trunc(bucket, Scan.scanned_at).label("date"),
                func.count(Scan.id).label("count"),
            )
            .where(
                Scan.campaign_id == campaign_id,
                Scan.scanned_at >= start,
            )
            .group_by("date")
            .order_by("date")
        )
        rows = (await session.execute(q)).all()
        series = [
            {"date": row.date.isoformat(), "scans": row.count} for row in rows
        ]

        return {
            "campaign_id": campaign_id,
            "range": range_,
            "bucket": bucket,
            "series": series,
        }


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
