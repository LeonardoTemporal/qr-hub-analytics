from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime
from pathlib import Path

SAFE_EXTENSION = re.compile(r"^\.[a-z0-9]{1,8}$")


def build_storage_key(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if not SAFE_EXTENSION.match(extension):
        extension = ".bin"
    date_path = datetime.now(UTC).strftime("%Y/%m")
    return f"originals/{date_path}/{secrets.token_hex(16)}{extension}"


def media_type_for(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    return "document"
