from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.domains.admin.security import digest_token
from app.models import AdminSession, AdminUser


async def require_admin_session(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    admin_session: Annotated[str | None, Cookie()] = None,
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> AdminUser:
    if not admin_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesion requerida")

    record = (
        await session.execute(
            select(AdminSession, AdminUser)
            .join(AdminUser, AdminUser.id == AdminSession.admin_user_id)
            .where(
                AdminSession.token_digest == digest_token(admin_session),
                AdminSession.revoked_at.is_(None),
                AdminSession.expires_at > datetime.now(UTC),
                AdminUser.is_active.is_(True),
            )
        )
    ).one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesion expirada")

    session_record, user = record
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if not x_csrf_token or x_csrf_token != session_record.csrf_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF invalido")

    session_record.last_seen_at = datetime.now(UTC)
    return user
