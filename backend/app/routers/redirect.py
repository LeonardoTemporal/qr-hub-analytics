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

import logging

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Scan
from app.services.geo_service import GeoLite2Service
from app.services.ua_service import UserAgentService

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Singletons de servicios – se inicializan una sola vez al importar el módulo
# (Open/Closed: se pueden sustituir por otras implementaciones sin tocar el router)
# ---------------------------------------------------------------------------
_geo_service = GeoLite2Service(settings.GEOIP_DB_PATH)
_ua_service = UserAgentService()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_client_ip(request: Request) -> str:
    """
    Extrae la IP real del cliente, respetando cabeceras de reverse-proxy
    (Nginx / Traefik / Dokploy).
    Nota de seguridad: solo confiar en X-Forwarded-For si el proxy es de confianza
    y está configurado correctamente (ver trusted_hosts en producción).
    """
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # La primera IP de la lista es la del cliente original
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()

    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Background Task – procesamiento asíncrono post-respuesta
# ---------------------------------------------------------------------------
async def _record_scan(
    campaign_id: str,
    ip_address: str,
    user_agent_string: str,
) -> None:
    """
    Procesa analíticas y persiste el registro en PostgreSQL.

    Abre su PROPIA sesión de base de datos (no reutiliza la del request,
    que ya fue cerrada al enviar la respuesta 302).
    Captura cualquier excepción para garantizar que ningún error interno
    afecte la experiencia del usuario final.
    """
    try:
        geo = _geo_service.lookup(ip_address)
        device = _ua_service.parse(user_agent_string)

        scan = Scan(
            campaign_id=campaign_id,
            country=geo.country,
            state=geo.state,
            city=geo.city,
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


# ---------------------------------------------------------------------------
# Endpoint principal
# ---------------------------------------------------------------------------
@router.get(
    "/r/{campaign_id}",
    status_code=302,
    summary="Redirección QR con tracking",
    response_description="Redirección 302 al frontend de la campaña",
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
    - Siempre redirige a https://7fitment.com/enlaces (URL de producción).
    """
    ip_address = _get_client_ip(request)
    user_agent_string = request.headers.get("User-Agent", "")

    background_tasks.add_task(
        _record_scan,
        campaign_id=campaign_id,
        ip_address=ip_address,
        user_agent_string=user_agent_string,
    )

    # Siempre redirigimos a la URL de producción
    target_url = "https://7fitment.com/enlaces"
    return RedirectResponse(url=target_url, status_code=302)
