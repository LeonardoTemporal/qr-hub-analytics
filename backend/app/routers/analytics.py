"""
Router de analíticas – Dashboard empresarial.

Proporciona datos agregados y métricas para visualización en dashboards.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Scan

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/analytics/{campaign_id}",
    summary="Obtener analíticas agregadas de una campaña",
    response_description="Datos estructurados para dashboard de métricas",
    tags=["analytics"],
)
async def get_analytics(campaign_id: str):
    """
    Endpoint principal de analíticas para una campaña.

    Retorna métricas agregadas para dashboard:
    - KPIs generales (total escaneos, dispositivos únicos, etc.)
    - Serie de tiempo (escaneos por día)
    - Distribución por device_type, os, browser
    - Top ubicaciones (país/ciudad)
    """
    async with AsyncSessionLocal() as session:
        # ─────────────────────────────────────────────────────────────────────
        # KPIs Generales
        # ─────────────────────────────────────────────────────────────────────
        total_scans_result = await session.execute(
            select(func.count(Scan.id)).where(Scan.campaign_id == campaign_id)
        )
        total_scans = total_scans_result.scalar() or 0

        # Últimos 7 días para KPIs recientes
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_scans_result = await session.execute(
            select(func.count(Scan.id)).where(
                Scan.campaign_id == campaign_id,
                Scan.scanned_at >= seven_days_ago,
            )
        )
        recent_scans = recent_scans_result.scalar() or 0

        # ─────────────────────────────────────────────────────────────────────
        # Serie de tiempo - Escaneos por día (últimos 30 días)
        # ─────────────────────────────────────────────────────────────────────
        thirty_days_ago = datetime.now() - timedelta(days=30)

        time_series_result = await session.execute(
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

        time_series = [
            {"date": str(row.date), "scans": row.count} for row in time_series_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Distribución por Device Type
        # ─────────────────────────────────────────────────────────────────────
        device_dist_result = await session.execute(
            select(Scan.device_type, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.device_type.isnot(None))
            .group_by(Scan.device_type)
            .order_by(func.count(Scan.id).desc())
        )

        device_distribution = [
            {"name": row.device_type or "Unknown", "value": row.count}
            for row in device_dist_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Distribución por OS
        # ─────────────────────────────────────────────────────────────────────
        os_dist_result = await session.execute(
            select(Scan.os, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.os.isnot(None))
            .group_by(Scan.os)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )

        os_distribution = [
            {"name": row.os or "Unknown", "value": row.count} for row in os_dist_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Distribución por Browser
        # ─────────────────────────────────────────────────────────────────────
        browser_dist_result = await session.execute(
            select(Scan.browser, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.browser.isnot(None))
            .group_by(Scan.browser)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )

        browser_distribution = [
            {"name": row.browser or "Unknown", "value": row.count}
            for row in browser_dist_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Top Países
        # ─────────────────────────────────────────────────────────────────────
        countries_result = await session.execute(
            select(Scan.country, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.country.isnot(None))
            .group_by(Scan.country)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )

        top_countries = [
            {"name": row.country or "Unknown", "value": row.count}
            for row in countries_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Top Ciudades
        # ─────────────────────────────────────────────────────────────────────
        cities_result = await session.execute(
            select(Scan.city, func.count(Scan.id).label("count"))
            .where(Scan.campaign_id == campaign_id, Scan.city.isnot(None))
            .group_by(Scan.city)
            .order_by(func.count(Scan.id).desc())
            .limit(10)
        )

        top_cities = [
            {"name": row.city or "Unknown", "value": row.count} for row in cities_result
        ]

        # ─────────────────────────────────────────────────────────────────────
        # Construir respuesta
        # ─────────────────────────────────────────────────────────────────────
        return {
            "campaign_id": campaign_id,
            "kpis": {
                "total_scans": total_scans,
                "recent_scans_7d": recent_scans,
            },
            "time_series": time_series,
            "device_distribution": device_distribution,
            "os_distribution": os_distribution,
            "browser_distribution": browser_distribution,
            "top_countries": top_countries,
            "top_cities": top_cities,
        }
