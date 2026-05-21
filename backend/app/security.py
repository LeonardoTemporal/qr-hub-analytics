from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from app.config import settings

PIN_HASH_ALGORITHM = "pbkdf2_sha256"
PIN_HASH_ITERATIONS = 260_000
PORTAL_TOKEN_PREFIX = "garage_v1"


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def hash_pin(pin: str) -> str:
    salt = secrets.token_urlsafe(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        pin.encode("utf-8"),
        salt.encode("utf-8"),
        PIN_HASH_ITERATIONS,
    )
    return f"{PIN_HASH_ALGORITHM}${PIN_HASH_ITERATIONS}${salt}${_b64encode(digest)}"


def verify_pin(pin: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_digest = stored_hash.split("$", 3)
        if algorithm != PIN_HASH_ALGORITHM:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            pin.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(_b64encode(digest), expected_digest)


def _portal_secret() -> bytes:
    secret = settings.PORTAL_TOKEN_SECRET or settings.ADMIN_PASSWORD
    return secret.encode("utf-8")


def create_portal_token(vehicle_id: int) -> str:
    expires_at = int(time.time()) + settings.PORTAL_TOKEN_TTL_SECONDS
    payload = {
        "vehicle_id": vehicle_id,
        "exp": expires_at,
        "nonce": secrets.token_urlsafe(12),
    }
    encoded_payload = _b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signature = _b64encode(
        hmac.new(_portal_secret(), encoded_payload.encode("ascii"), hashlib.sha256).digest()
    )
    return f"{PORTAL_TOKEN_PREFIX}.{encoded_payload}.{signature}"


def verify_portal_token(token: str) -> dict[str, Any] | None:
    try:
        prefix, encoded_payload, signature = token.split(".", 2)
        if prefix != PORTAL_TOKEN_PREFIX:
            return None
        expected_signature = _b64encode(
            hmac.new(
                _portal_secret(),
                encoded_payload.encode("ascii"),
                hashlib.sha256,
            ).digest()
        )
        if not hmac.compare_digest(signature, expected_signature):
            return None
        payload = json.loads(_b64decode(encoded_payload))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        if not isinstance(payload.get("vehicle_id"), int):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
