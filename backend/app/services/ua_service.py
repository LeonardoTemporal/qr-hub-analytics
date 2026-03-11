"""
Servicio de análisis de User-Agent.

Responsabilidad única: convertir una cadena User-Agent cruda en
información estructurada sobre dispositivo, sistema operativo y navegador.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal, Optional

logger = logging.getLogger(__name__)

DeviceType = Literal["mobile", "tablet", "desktop", "other"]


# ---------------------------------------------------------------------------
# Value Object
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class DeviceInfo:
    device_type: Optional[DeviceType] = None
    os: Optional[str] = None
    browser: Optional[str] = None


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class UserAgentService:
    """
    Parsea User-Agent strings usando la librería `user-agents`.
    Si el parseo falla (cadena vacía, UA desconocido, etc.) devuelve
    un DeviceInfo con todos los campos nulos – nunca propaga excepciones.
    """

    def parse(self, user_agent_string: str) -> DeviceInfo:
        if not user_agent_string:
            return DeviceInfo()
        try:
            from user_agents import parse  # lazy import

            ua = parse(user_agent_string)

            if ua.is_mobile:
                device_type: DeviceType = "mobile"
            elif ua.is_tablet:
                device_type = "tablet"
            elif ua.is_pc:
                device_type = "desktop"
            else:
                device_type = "other"

            return DeviceInfo(
                device_type=device_type,
                os=ua.os.family or None,
                browser=ua.browser.family or None,
            )
        except Exception as exc:
            logger.debug("User-Agent parsing failed for '%s': %s", user_agent_string, exc)
            return DeviceInfo()
