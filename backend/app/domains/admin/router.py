from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.domains.admin.security import create_session_token, digest_token, verify_password
from app.models import AdminSession, AdminUser

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])
SESSION_TTL = timedelta(hours=12)


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=200)


class AdminSessionResponse(BaseModel):
    username: str
    csrf_token: str
    expires_at: datetime


@router.post("/login", response_model=AdminSessionResponse)
async def login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AdminSessionResponse:
    user = (
        await session.execute(
            select(AdminUser).where(
                AdminUser.username == payload.username,
                AdminUser.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    raw_token, token_digest = create_session_token()
    csrf_token = secrets.token_urlsafe(24)
    expires_at = datetime.now(UTC) + SESSION_TTL
    session.add(
        AdminSession(
            admin_user_id=user.id,
            token_digest=token_digest,
            csrf_token=csrf_token,
            expires_at=expires_at,
        )
    )
    user.last_login_at = datetime.now(UTC)
    await session.commit()
    response.set_cookie(
        "admin_session",
        raw_token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=settings.ADMIN_COOKIE_SECURE or request.url.scheme == "https",
        samesite="lax",
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    return AdminSessionResponse(username=user.username, csrf_token=csrf_token, expires_at=expires_at)


@router.get("/session", response_model=AdminSessionResponse)
async def current_session(
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    admin_session: Annotated[str | None, Cookie()] = None,
) -> AdminSessionResponse:
    record = (
        await session.execute(
            select(AdminSession).where(
                AdminSession.token_digest == digest_token(admin_session or ""),
                AdminSession.revoked_at.is_(None),
            )
        )
    ).scalar_one()
    return AdminSessionResponse(
        username=user.username,
        csrf_token=record.csrf_token,
        expires_at=record.expires_at,
    )


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    admin_session: Annotated[str | None, Cookie()] = None,
) -> Response:
    record = (
        await session.execute(
            select(AdminSession).where(
                AdminSession.token_digest == digest_token(admin_session or "")
            )
        )
    ).scalar_one_or_none()
    if record:
        record.revoked_at = datetime.now(UTC)
        await session.commit()
    response.delete_cookie("admin_session", path="/", domain=settings.COOKIE_DOMAIN)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
