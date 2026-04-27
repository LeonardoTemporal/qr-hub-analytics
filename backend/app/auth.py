"""
Autenticación HTTP Basic para endpoints administrativos del dashboard.

Las credenciales se leen desde variables de entorno (ADMIN_USERNAME / ADMIN_PASSWORD).
Comparación con `secrets.compare_digest` para mitigar timing attacks.

Uso:
    from fastapi import Depends
    from app.auth import require_admin

    @router.get("/protegido")
    async def endpoint(_: str = Depends(require_admin)):
        ...
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import settings

_security = HTTPBasic()


def require_admin(
    credentials: Annotated[HTTPBasicCredentials, Depends(_security)],
) -> str:
    """
    Valida credenciales admin de forma constante en tiempo (anti-timing).
    Devuelve el username autenticado para uso opcional en logs.
    """
    expected_user = settings.ADMIN_USERNAME.encode("utf-8")
    expected_pass = settings.ADMIN_PASSWORD.encode("utf-8")
    provided_user = credentials.username.encode("utf-8")
    provided_pass = credentials.password.encode("utf-8")

    user_ok = secrets.compare_digest(expected_user, provided_user)
    pass_ok = secrets.compare_digest(expected_pass, provided_pass)

    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username


def verify_login(username: str, password: str) -> bool:
    """
    Verifica credenciales sin lanzar excepciones — para endpoint /auth/login.
    Útil cuando queremos devolver 200/401 explícitos según el caso.
    """
    expected_user = settings.ADMIN_USERNAME.encode("utf-8")
    expected_pass = settings.ADMIN_PASSWORD.encode("utf-8")
    provided_user = username.encode("utf-8")
    provided_pass = password.encode("utf-8")

    return secrets.compare_digest(expected_user, provided_user) and secrets.compare_digest(
        expected_pass, provided_pass
    )
