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

import hashlib
import ipaddress
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_, select, update

from app.config import settings
from app.database import AsyncSessionLocal
from app.domains.tracking.service import attribution_expires_at
from app.models import Scan, ScanSession, VehicleQRCode
from app.services.geo_service import IPApiGeoService
from app.services.geohash_service import compute_scan_geohashes
from app.services.proxy_service import is_trusted_internal_proxy
from app.services.rate_limit_service import SlidingWindowRateLimiter
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
_redirect_rate_limiter = SlidingWindowRateLimiter()
_browser_location_rate_limiter = SlidingWindowRateLimiter()


class BrowserLocationPayload(BaseModel):
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    accuracy_meters: int | None = Field(default=None, gt=0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalise_client_ip(value: str | None) -> str | None:
    candidate = (value or "").strip()
    if not candidate:
        return None
    if candidate.startswith("[") and "]" in candidate:
        candidate = candidate[1 : candidate.index("]")]
    elif candidate.count(":") == 1 and "." in candidate:
        candidate = candidate.rsplit(":", 1)[0]
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def _is_trusted_proxy_peer(request: Request) -> bool:
    return is_trusted_internal_proxy(request)


def _get_client_ip(request: Request) -> str:
    """
    Extrae la IP real del cliente, respetando cabeceras de reverse-proxy
    (Cloudflare Tunnel / Nginx / Traefik / Dokploy).
    Nota de seguridad: solo confiar en X-Forwarded-For si el proxy es de confianza
    y está configurado correctamente (ver trusted_hosts en producción).
    """
    candidates: list[str | None] = []
    if _is_trusted_proxy_peer(request):
        candidates.extend(
            (
                request.headers.get("CF-Connecting-IP"),
                (request.headers.get("X-Forwarded-For") or "").split(",")[0],
                request.headers.get("X-Real-IP"),
            )
        )
    candidates.append(request.client.host if request.client else None)
    for candidate in candidates:
        normalised = _normalise_client_ip(candidate)
        if normalised:
            return normalised
    return "unknown"


def _request_uses_https(request: Request) -> bool:
    """Detecta HTTPS externo sin depender del esquema HTTP interno del proxy."""
    if settings.QR_COOKIE_SECURE or request.url.scheme.lower() == "https":
        return True

    if not _is_trusted_proxy_peer(request):
        return False

    cf_visitor = request.headers.get("CF-Visitor")
    if cf_visitor:
        try:
            visitor_data = json.loads(cf_visitor)
        except (TypeError, ValueError):
            visitor_data = {}
        if (
            isinstance(visitor_data, dict)
            and str(visitor_data.get("scheme", "")).lower() == "https"
        ):
            return True

    forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
    return forwarded_proto.split(",")[0].strip().lower() == "https"


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

    frontend_base = frontend_url.rstrip("/")
    target = frontend_base if frontend_base.endswith("/enlaces") else f"{frontend_base}/enlaces"
    if scan_token:
        return f"{target}?qr=1"
    return target


def _should_record_analytics(campaign_id: str) -> bool:
    return campaign_id.strip().lower() in settings.tracking_analytics_campaigns


# ---------------------------------------------------------------------------
# Persistencia minima antes del redirect; enriquecimiento GeoIP post-respuesta.
# ---------------------------------------------------------------------------
async def _record_scan(
    campaign_id: str,
    user_agent_string: str,
    scan_token: str | None = None,
    vehicle_qr_code_id: int | None = None,
    landing_path: str = "/enlaces",
) -> int | None:
    """
    Persiste la atribucion y el dispositivo antes de responder.

    Es una transaccion local corta, sin red externa. Si PostgreSQL no esta
    disponible, el redirect continua sin cookie ni marcador de atribucion.
    """
    try:
        device = _ua_service.parse(user_agent_string)
        scan = Scan(
            campaign_id=campaign_id,
            scan_token=scan_token,
            country="Unknown",
            state="Unknown",
            city="Unknown",
            geo_source="ip",
            device_type=device.device_type,
            os=device.os,
            browser=device.browser,
        )

        async with AsyncSessionLocal() as session:
            session.add(scan)
            await session.flush()
            if scan_token:
                session.add(
                    ScanSession(
                        scan_id=scan.id,
                        vehicle_qr_code_id=vehicle_qr_code_id,
                        attribution_token=scan_token,
                        landing_path=landing_path,
                        expires_at=attribution_expires_at(),
                    )
                )
            await session.commit()

        logger.debug("Scan recorded: campaign=%r", campaign_id)
        return scan.id
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Silent failure recording scan for campaign=%r: %s",
            campaign_id,
            exc,
            exc_info=True,
        )
        return None


async def _enrich_scan_geo(scan_id: int, ip_address: str) -> None:
    """Enriquece GeoIP sin sobrescribir una ubicacion precisa del navegador."""
    try:
        geo = await _geo_service.lookup(ip_address)
        geo_hash_5, geo_hash_7 = compute_scan_geohashes(
            geo.latitude,
            geo.longitude,
        )
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Scan)
                .where(
                    Scan.id == scan_id,
                    or_(Scan.geo_source.is_(None), Scan.geo_source != "browser"),
                )
                .values(
                    country=geo.country,
                    state=geo.state,
                    city=geo.city,
                    geo_source="ip",
                    latitude=geo.latitude,
                    longitude=geo.longitude,
                    accuracy_meters=geo.accuracy_meters,
                    geo_hash_5=geo_hash_5,
                    geo_hash_7=geo_hash_7,
                )
            )
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("GeoIP enrichment failed for scan=%s: %s", scan_id, exc)


async def _resolve_redirect_target(
    campaign_id: str,
    scan_token: str | None,
) -> tuple[str, int | None, str]:
    if campaign_id in settings.tracking_destinations or _should_record_analytics(campaign_id):
        target = _build_redirect_target(settings.FRONTEND_URL, campaign_id, scan_token)
        return target, None, "/enlaces"

    try:
        async with AsyncSessionLocal() as session:
            qr_code = (
                await session.execute(
                    select(VehicleQRCode).where(
                        VehicleQRCode.is_active.is_(True),
                        (VehicleQRCode.qr_id == campaign_id)
                        | (VehicleQRCode.public_slug == campaign_id),
                    )
                )
            ).scalar_one_or_none()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "QR destination lookup failed; using links fallback: campaign=%r error=%s",
            campaign_id,
            exc,
        )
        return _build_redirect_target(settings.FRONTEND_URL), None, "/enlaces"

    if not qr_code:
        target = _build_redirect_target(settings.FRONTEND_URL, campaign_id, scan_token)
        return target, None, "/enlaces"

    path = f"/auto/{qr_code.public_slug}"
    separator = "&" if "?" in path else "?"
    target = f"{settings.FRONTEND_URL.rstrip('/')}{path}"
    if scan_token:
        target = f"{target}{separator}qr=1"
    return target, qr_code.id, path


def _clean_location_value(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    return value[:100] if value else None


def _clean_accuracy(value: int | None) -> int | None:
    if value is None or value <= 0:
        return None
    return max(100, min(value, 100_000))


def _minimise_coordinate(value: float | None) -> float | None:
    return round(value, 3) if value is not None else None


async def _apply_browser_location(
    payload: BrowserLocationPayload,
    attribution_token: str,
) -> bool:
    async with AsyncSessionLocal() as session:
        scan = (
            await session.execute(
                select(Scan)
                .join(ScanSession, ScanSession.scan_id == Scan.id)
                .where(
                    ScanSession.attribution_token == attribution_token,
                    ScanSession.expires_at > datetime.now(timezone.utc),
                )
            )
        ).scalar_one_or_none()
        if not scan:
            return False

        scan.country = _clean_location_value(payload.country) or scan.country
        scan.state = _clean_location_value(payload.state) or scan.state
        scan.city = _clean_location_value(payload.city) or scan.city
        scan.latitude = (
            _minimise_coordinate(payload.latitude)
            if payload.latitude is not None
            else scan.latitude
        )
        scan.longitude = (
            _minimise_coordinate(payload.longitude)
            if payload.longitude is not None
            else scan.longitude
        )
        scan.accuracy_meters = (
            _clean_accuracy(payload.accuracy_meters) or scan.accuracy_meters
        )
        scan.geo_hash_5, scan.geo_hash_7 = compute_scan_geohashes(
            scan.latitude,
            scan.longitude,
        )
        scan.geo_source = "browser"
        await session.commit()
        logger.info("Browser location applied: campaign=%r", scan.campaign_id)
        return True


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
    - Persiste una atribucion local corta y enriquece GeoIP en segundo plano.
    - Redirige al destino configurado, sin pop-ups ni permisos de navegador.
    """
    ip_address = _get_client_ip(request)
    tracking_allowed = await _redirect_rate_limiter.allow(
        f"redirect:{ip_address}",
        limit=settings.QR_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    )

    user_agent_string = request.headers.get("User-Agent", "")
    initial_tracking = tracking_allowed and _should_record_analytics(campaign_id)
    provisional_token = secrets.token_urlsafe(32) if initial_tracking else None
    target_url, vehicle_qr_code_id, landing_path = await _resolve_redirect_target(
        campaign_id, provisional_token
    )
    should_record = tracking_allowed and (
        _should_record_analytics(campaign_id) or vehicle_qr_code_id is not None
    )
    scan_token = provisional_token or (secrets.token_urlsafe(32) if should_record else None)
    if scan_token and not provisional_token:
        target_url, vehicle_qr_code_id, landing_path = await _resolve_redirect_target(
            campaign_id, scan_token
        )
    logger.info("Tracking request received: campaign=%r", campaign_id)
    if not tracking_allowed:
        logger.warning(
            "Tracking admission throttled; redirect preserved: campaign=%r",
            campaign_id,
        )

    persisted_scan_id: int | None = None
    if should_record:
        persisted_scan_id = await _record_scan(
            campaign_id=campaign_id,
            user_agent_string=user_agent_string,
            scan_token=scan_token,
            vehicle_qr_code_id=vehicle_qr_code_id,
            landing_path=landing_path,
        )
        if persisted_scan_id is not None:
            background_tasks.add_task(
                _enrich_scan_geo,
                scan_id=persisted_scan_id,
                ip_address=ip_address,
            )
        else:
            scan_token = None
            target_url, vehicle_qr_code_id, landing_path = await _resolve_redirect_target(
                campaign_id,
                None,
            )

    response = RedirectResponse(url=target_url, status_code=302)
    response.headers["Cache-Control"] = "no-store, private, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if scan_token:
        response.set_cookie(
            "qr_attribution",
            scan_token,
            max_age=30 * 24 * 60 * 60,
            httponly=True,
            secure=_request_uses_https(request),
            samesite="lax",
            path="/",
            domain=settings.COOKIE_DOMAIN,
        )
    return response


@router.post(
    "/api/analytics/browser-location",
    summary="Actualiza ubicación precisa otorgada por el navegador",
    tags=["analytics"],
)
async def update_browser_location(
    payload: BrowserLocationPayload,
    request: Request,
) -> dict[str, Any]:
    attribution_token = request.cookies.get("qr_attribution")
    if not attribution_token:
        raise HTTPException(status_code=401, detail="QR attribution required")
    if not is_trusted_internal_proxy(request):
        raise HTTPException(status_code=403, detail="Trusted proxy required")

    ip_address = _get_client_ip(request)
    token_digest = hashlib.sha256(attribution_token.encode("utf-8")).hexdigest()[:16]
    if not await _browser_location_rate_limiter.allow(
        f"browser-location:{ip_address}:{token_digest}",
        limit=settings.BROWSER_LOCATION_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=429,
            detail="Too many location requests",
            headers={"Retry-After": "60"},
        )

    updated = await _apply_browser_location(payload, attribution_token)
    return {"success": True, "updated": updated}
