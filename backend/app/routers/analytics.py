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

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, func, select

from app.database import AsyncSessionLocal
from app.domains.admin.dependencies import require_admin_session
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


def _scan_filters(
    campaign_id: str | None,
    range_: TimeRange | None = None,
) -> tuple:
    filters = list(_campaign_filters(campaign_id))
    if range_:
        filters.append(Scan.scanned_at >= _range_to_start(range_))
    return tuple(filters)


def _campaign_label(campaign_id: str | None) -> str:
    return campaign_id if campaign_id and campaign_id.lower() != "all" else "all"


def _location_display(scan: Scan) -> str:
    parts = [scan.city, scan.state, scan.country]
    return ", ".join(part for part in parts if part) or "Unknown"


def _normalise_scan_sort(sort_by: str, sort_order: str):
    sort_columns = {
        "id": Scan.id,
        "campaign_id": Scan.campaign_id,
        "scanned_at": Scan.scanned_at,
        "city": Scan.city,
        "state": Scan.state,
        "device_type": Scan.device_type,
        "os": Scan.os,
        "browser": Scan.browser,
    }
    column = sort_columns.get(sort_by)
    if column is None:
        raise ValueError("sort_by must be one of: " + ", ".join(sort_columns))
    if sort_order not in {"asc", "desc"}:
        raise ValueError("sort_order must be asc or desc")
    return column.asc() if sort_order == "asc" else column.desc()


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
    range_: TimeRange | None = None,
    limit: int = 10,
) -> list[dict[str, int | str]]:
    rows = (
        await session.execute(
            select(column.label("name"), func.count(Scan.id).label("count"))
            .where(
                *_scan_filters(campaign_id, range_),
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


async def _build_geo_clusters(
    session,
    campaign_id: str | None = None,
    range_: TimeRange | None = None,
) -> list[dict]:
    rows = (
        await session.execute(
            select(
                Scan.geo_hash_5.label("geo_hash_5"),
                func.avg(Scan.latitude).label("latitude"),
                func.avg(Scan.longitude).label("longitude"),
                func.count(Scan.id).label("scan_count"),
                func.count(
                    distinct(
                        func.concat(
                            func.coalesce(Scan.device_type, "unknown"),
                            "|",
                            func.coalesce(Scan.os, "unknown"),
                            "|",
                            func.coalesce(Scan.browser, "unknown"),
                        )
                    )
                ).label("unique_devices"),
                func.max(Scan.device_type).label("top_device_type"),
                func.max(Scan.os).label("top_os"),
            )
            .where(
                *_scan_filters(campaign_id, range_),
                Scan.geo_hash_5.isnot(None),
                Scan.latitude.isnot(None),
                Scan.longitude.isnot(None),
            )
            .group_by(Scan.geo_hash_5)
            .order_by(func.count(Scan.id).desc())
            .limit(200)
        )
    ).all()
    return [
        {
            "geo_hash_5": row.geo_hash_5,
            "latitude": float(row.latitude),
            "longitude": float(row.longitude),
            "scan_count": row.scan_count,
            "unique_devices": row.unique_devices,
            "top_device_type": row.top_device_type,
            "top_os": row.top_os,
        }
        for row in rows
    ]


async def _build_geo(
    session,
    campaign_id: str | None = None,
    range_: TimeRange | None = None,
) -> dict:
    cities = await _name_value_rows(session, Scan.city, campaign_id, range_, limit=20)
    return {
        "campaign_id": _campaign_label(campaign_id),
        "countries": await _name_value_rows(session, Scan.country, campaign_id, range_),
        "states": await _name_value_rows(session, Scan.state, campaign_id, range_, limit=20),
        "municipalities": cities,
        "cities": cities,
        "clusters": await _build_geo_clusters(session, campaign_id, range_),
    }


async def _build_scan_details(
    session,
    campaign_id: str | None = None,
    range_: TimeRange = "30d",
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "scanned_at",
    sort_order: str = "desc",
) -> dict:
    try:
        order_by = _normalise_scan_sort(sort_by, sort_order)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    filters = _scan_filters(campaign_id, range_)
    offset = (page - 1) * page_size
    total = (
        await session.execute(select(func.count(Scan.id)).where(*filters))
    ).scalar() or 0
    rows = (
        await session.execute(
            select(Scan)
            .where(*filters)
            .order_by(order_by)
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()

    return {
        "items": [
            {
                "id": scan.id,
                "campaign_id": scan.campaign_id,
                "scan_token": scan.scan_token,
                "country": scan.country,
                "state": scan.state,
                "city": scan.city,
                "location_display": _location_display(scan),
                "latitude": scan.latitude,
                "longitude": scan.longitude,
                "accuracy_meters": scan.accuracy_meters,
                "geo_source": scan.geo_source,
                "device_type": scan.device_type,
                "os": scan.os,
                "browser": scan.browser,
                "scanned_at": scan.scanned_at.isoformat(),
            }
            for scan in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "sort_by": sort_by,
        "sort_order": sort_order,
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
    campaign_id: str | None = Query(default=None),
    range_: TimeRange | None = Query(default=None, alias="range"),
):
    async with AsyncSessionLocal() as session:
        return await _build_geo(session, campaign_id, range_)


@router.get(
    "/analytics/scans",
    summary="Tabla paginada de escaneos QR",
    tags=["analytics"],
)
async def get_scans(
    _: Annotated[str, Depends(require_admin_session)],
    campaign_id: str | None = Query(default=None),
    range_: TimeRange = Query("30d", alias="range"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort_by: str = Query("scanned_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
):
    async with AsyncSessionLocal() as session:
        return await _build_scan_details(
            session,
            campaign_id=campaign_id,
            range_=range_,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )


@router.get(
    "/analytics/timeline",
    summary="Serie temporal global de escaneos",
    tags=["analytics"],
)
async def get_timeline_global(
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
    _: Annotated[str, Depends(require_admin_session)],
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
