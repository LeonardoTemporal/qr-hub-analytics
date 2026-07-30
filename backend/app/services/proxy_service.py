from __future__ import annotations

import hmac
import ipaddress

from starlette.requests import Request

from app.config import settings


def is_trusted_internal_proxy(request: Request) -> bool:
    if not settings.TRUST_PROXY_HEADERS or not settings.INTERNAL_PROXY_SECRET:
        return False
    supplied_secret = request.headers.get("X-QRHub-Proxy-Secret", "")
    if not hmac.compare_digest(
        supplied_secret.encode("utf-8"),
        settings.INTERNAL_PROXY_SECRET.encode("utf-8"),
    ):
        return False
    try:
        peer = ipaddress.ip_address(request.client.host if request.client else "")
    except ValueError:
        return False
    return peer.is_private or peer.is_loopback
