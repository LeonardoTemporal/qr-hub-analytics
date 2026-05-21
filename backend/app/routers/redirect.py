"""
Router de redirección QR.

Flujo:
    GET /r/{campaign_id}
    1. Extrae IP real y User-Agent del request HTTP.
    2. Responde con 302 Redirect INSTANTÁNEO al frontend (latencia cero).
    3. BackgroundTask asíncrona: geo-lookup + UA-parse + INSERT en PostgreSQL.
       La tarea falla de forma silenciosa para no impactar al usuario final.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
from typing import Any
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Scan
from app.services.geo_service import IPApiGeoService
from app.services.ua_service import UserAgentService

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Singletons de servicios – se inicializan una sola vez al importar el módulo
# (Open/Closed: se pueden sustituir por otras implementaciones sin tocar el router)
# ---------------------------------------------------------------------------
_geo_service = IPApiGeoService(
    base_url=settings.GEOIP_API_URL,
    timeout_seconds=settings.GEOIP_TIMEOUT_SECONDS,
)
_ua_service = UserAgentService()


class BrowserLocationPayload(BaseModel):
    scan_token: str = Field(min_length=16, max_length=120)
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_client_ip(request: Request) -> str:
    """
    Extrae la IP real del cliente, respetando cabeceras de reverse-proxy
    (Cloudflare Tunnel / Nginx / Traefik / Dokploy).
    Nota de seguridad: solo confiar en X-Forwarded-For si el proxy es de confianza
    y está configurado correctamente (ver trusted_hosts en producción).
    """
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # La primera IP de la lista es la del cliente original
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()

    return request.client.host if request.client else "unknown"


def _build_redirect_target(
    frontend_url: str,
    campaign_id: str | None = None,
    scan_token: str | None = None,
) -> str:
    if campaign_id:
        tracked_destination = settings.tracking_destinations.get(
            campaign_id.strip().lower()
        )
        if tracked_destination:
            return tracked_destination

    target = f"{frontend_url.rstrip('/')}/enlaces"
    if scan_token:
        return f"{target}?{urlencode({'scan': scan_token})}"
    return target


def _should_record_analytics(campaign_id: str) -> bool:
    return campaign_id.strip().lower() in settings.tracking_analytics_campaigns


# ---------------------------------------------------------------------------
# Background Task – procesamiento asíncrono post-respuesta
# ---------------------------------------------------------------------------
async def _record_scan(
    campaign_id: str,
    ip_address: str,
    user_agent_string: str,
    scan_token: str | None = None,
) -> None:
    """
    Procesa analíticas y persiste el registro en PostgreSQL.

    Abre su PROPIA sesión de base de datos (no reutiliza la del request,
    que ya fue cerrada al enviar la respuesta 302).
    Captura cualquier excepción para garantizar que ningún error interno
    afecte la experiencia del usuario final.
    """
    try:
        geo = await _geo_service.lookup(ip_address)
        device = _ua_service.parse(user_agent_string)

        scan = Scan(
            campaign_id=campaign_id,
            scan_token=scan_token,
            country=geo.country,
            state=geo.state,
            city=geo.city,
            geo_source="ip",
            device_type=device.device_type,
            os=device.os,
            browser=device.browser,
        )

        async with AsyncSessionLocal() as session:
            session.add(scan)
            await session.commit()

        logger.debug(
            "Scan recorded: campaign=%r country=%r state=%r city=%r device=%r",
            campaign_id,
            geo.country,
            geo.state,
            geo.city,
            device.device_type,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Silent failure recording scan for campaign=%r: %s",
            campaign_id,
            exc,
            exc_info=True,
        )


def _clean_location_value(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    return value[:100] if value else None


async def _apply_browser_location(payload: BrowserLocationPayload) -> bool:
    for _ in range(10):
        async with AsyncSessionLocal() as session:
            scan = (
                await session.execute(
                    select(Scan).where(Scan.scan_token == payload.scan_token)
                )
            ).scalar_one_or_none()
            if scan:
                scan.country = _clean_location_value(payload.country) or scan.country
                scan.state = _clean_location_value(payload.state) or scan.state
                scan.city = _clean_location_value(payload.city) or scan.city
                scan.geo_source = "browser"
                await session.commit()
                logger.info(
                    "Browser location applied: campaign=%r country=%r state=%r city=%r",
                    scan.campaign_id,
                    scan.country,
                    scan.state,
                    scan.city,
                )
                return True
        await asyncio.sleep(0.2)
    return False


# ---------------------------------------------------------------------------
# Endpoint principal
# ---------------------------------------------------------------------------
@router.get(
    "/qr/{campaign_id}",
    status_code=302,
    summary="Redirección QR con tracking",
    response_description="Redirección 302 al destino configurado",
    tags=["redirect"],
)
@router.get(
    "/t/{campaign_id}",
    status_code=302,
    summary="Redirección QR con tracking",
    response_description="Redirección 302 al destino configurado",
    tags=["redirect"],
)
@router.get(
    "/r/{campaign_id}",
    status_code=302,
    summary="Redirección QR con tracking",
    response_description="Redirección 302 al destino configurado",
    tags=["redirect"],
)
async def redirect_campaign(
    campaign_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
) -> RedirectResponse:
    """
    Punto de entrada del QR físico.

    - Devuelve **302 redirect** de forma inmediata (latencia cero para el usuario).
    - Encola en segundo plano el registro de analíticas sin bloquear la respuesta.
    - Redirige al destino configurado, sin pop-ups ni permisos de navegador.
    """
    ip_address = _get_client_ip(request)
    user_agent_string = request.headers.get("User-Agent", "")
    scan_token = secrets.token_urlsafe(32) if _should_record_analytics(campaign_id) else None
    logger.info(
        "Tracking request received: campaign=%r detected_ip=%r",
        campaign_id,
        ip_address,
    )

    if _should_record_analytics(campaign_id):
        background_tasks.add_task(
            _record_scan,
            campaign_id=campaign_id,
            ip_address=ip_address,
            user_agent_string=user_agent_string,
            scan_token=scan_token,
        )

    target_url = _build_redirect_target(settings.FRONTEND_URL, campaign_id, scan_token)
    return RedirectResponse(url=target_url, status_code=302)


@router.post(
    "/api/analytics/browser-location",
    summary="Actualiza ubicación precisa otorgada por el navegador",
    tags=["analytics"],
)
async def update_browser_location(
    payload: BrowserLocationPayload,
) -> dict[str, Any]:
    updated = await _apply_browser_location(payload)
    return {"success": True, "updated": updated}
