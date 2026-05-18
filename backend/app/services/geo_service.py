"""
Servicio de geolocalizacion IP para analiticas de QR.

Traduce la IP publica del escaneo a pais, estado y municipio/ciudad mediante
ip-api.com. El servicio esta disenado para degradar siempre a "Unknown" si la
consulta externa falla o excede el timeout.
"""

from __future__ import annotations

import ipaddress
import logging
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)

UNKNOWN_LOCATION = "Unknown"


@dataclass(frozen=True, slots=True)
class GeoLocation:
    country: str = UNKNOWN_LOCATION
    state: str = UNKNOWN_LOCATION
    city: str = UNKNOWN_LOCATION


@runtime_checkable
class IGeoService(Protocol):
    async def lookup(self, ip_address: str) -> GeoLocation: ...


def _normalise_ip(ip_address: str) -> str:
    ip_address = (ip_address or "").strip()
    if ip_address.startswith("[") and "]" in ip_address:
        return ip_address[1 : ip_address.index("]")]
    if ip_address.count(":") == 1 and "." in ip_address:
        return ip_address.rsplit(":", 1)[0]
    return ip_address


def _is_public_ip(ip_address: str) -> bool:
    try:
        parsed = ipaddress.ip_address(ip_address)
    except ValueError:
        return False
    return parsed.is_global


def _clean_location(value: Any) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return UNKNOWN_LOCATION


class IPApiGeoService:
    """
    Resuelve IPs publicas usando http://ip-api.com/json/{ip}.

    El timeout por defecto es 1.5s para proteger la velocidad percibida del
    redirect. IPs privadas/locales devuelven Unknown sin hacer llamada externa.
    """

    def __init__(
        self,
        base_url: str = "http://ip-api.com/json",
        timeout_seconds: float = 1.5,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def lookup(self, ip_address: str) -> GeoLocation:
        ip_address = _normalise_ip(ip_address)
        if not ip_address or not _is_public_ip(ip_address):
            return GeoLocation()

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(
                    f"{self._base_url}/{ip_address}",
                    params={
                        "fields": "status,country,regionName,city,message",
                    },
                )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.debug("IP geolocation failed for %r: %s", ip_address, exc)
            return GeoLocation()

        if payload.get("status") != "success":
            logger.debug(
                "IP geolocation returned non-success for %r: %r",
                ip_address,
                payload.get("message"),
            )
            return GeoLocation()

        return GeoLocation(
            country=_clean_location(payload.get("country")),
            state=_clean_location(payload.get("regionName")),
            city=_clean_location(payload.get("city")),
        )


class GeoLite2Service(IPApiGeoService):
    """Compatibilidad con imports antiguos que pasaban una ruta .mmdb."""

    def __init__(self, _db_path: str | None = None) -> None:
        super().__init__()
