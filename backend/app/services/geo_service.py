"""
Servicio de geolocalización basado en MaxMind GeoLite2.

Principio de responsabilidad única (S): este módulo se ocupa
exclusivamente de traducir una IP a ubicación geográfica.

El uso de un Protocol (IGeoService) cumple con el principio
de inversión de dependencias (D): el router depende de la
abstracción, no de la implementación concreta.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Value Object
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class GeoLocation:
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None


# ---------------------------------------------------------------------------
# Abstraction (I / D – SOLID)
# ---------------------------------------------------------------------------
@runtime_checkable
class IGeoService(Protocol):
    def lookup(self, ip_address: str) -> GeoLocation: ...


# ---------------------------------------------------------------------------
# Concrete implementation – GeoLite2 (MaxMind)
# ---------------------------------------------------------------------------
class GeoLite2Service:
    """
    Resuelve IPs a ubicaciones usando la base de datos GeoLite2-City.mmdb.

    Si la base de datos no está disponible (p.ej. primer deploy sin el .mmdb),
    el servicio degrada de forma silenciosa y devuelve valores nulos, de modo
    que el flujo de redirección nunca se interrumpa.

    Descarga la DB desde: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
    Monta el archivo .mmdb en /app/GeoLite2-City.mmdb dentro del contenedor.
    """

    def __init__(self, db_path: str) -> None:
        self._reader = None
        try:
            import geoip2.database  # lazy import – no falla si no está instalado

            self._reader = geoip2.database.Reader(db_path)
            logger.info("GeoLite2 database loaded from '%s'.", db_path)
        except Exception as exc:
            logger.warning(
                "GeoIP database unavailable at '%s': %s. "
                "Country/city will be stored as NULL.",
                db_path,
                exc,
            )

    def lookup(self, ip_address: str) -> GeoLocation:
        if not self._reader:
            return GeoLocation()
        try:
            response = self._reader.city(ip_address)

            # MaxMind devuelve subdivisions con jerarquía (estado → municipio).
            # En México: subdivisions[0] = estado (ej. "Jalisco", "Ciudad de México").
            # response.city.name suele ser el municipio / ciudad principal.
            state_name: Optional[str] = None
            if response.subdivisions:
                most_specific = response.subdivisions.most_specific
                state_name = most_specific.name or None

            return GeoLocation(
                country=response.country.name or None,
                state=state_name,
                city=response.city.name or None,
            )
        except Exception as exc:
            logger.debug("GeoIP lookup failed for '%s': %s", ip_address, exc)
            return GeoLocation()
