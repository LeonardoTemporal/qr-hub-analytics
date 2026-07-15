from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.domains.admin.security import (
    create_session_token,
    digest_token,
    hash_password,
    verify_password,
)
from app.models import AdminSession, AdminUser, AuditLog

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])
SESSION_TTL = timedelta(hours=12)


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=200)


class AdminSessionResponse(BaseModel):
    username: str
    csrf_token: str
    expires_at: datetime


class AdminCredentialUpdate(BaseModel):
    current_password: str = Field(min_length=8, max_length=200)
    new_username: str | None = Field(
        default=None,
        min_length=3,
        max_length=100,
        pattern=r"^[A-Za-z0-9._-]+$",
    )
    new_password: str | None = Field(default=None, min_length=12, max_length=200)

    @field_validator("new_username", mode="before")
    @classmethod
    def strip_username(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def require_change(self) -> AdminCredentialUpdate:
        if self.new_username is None and self.new_password is None:
            raise ValueError("Debes indicar un nuevo usuario o una nueva contrasena")
        return self


def _request_ip(request: Request) -> str | None:
    for header in ("CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"):
        value = request.headers.get(header)
        if value:
            return value.split(",", 1)[0].strip()
    return request.client.host if request.client else None


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


@router.patch("/credentials", status_code=status.HTTP_204_NO_CONTENT)
async def update_credentials(
    payload: AdminCredentialUpdate,
    request: Request,
    response: Response,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contrasena actual no es correcta",
        )

    changed_fields: list[str] = []
    if payload.new_username and payload.new_username != user.username:
        duplicate = (
            await session.execute(
                select(AdminUser.id).where(
                    func.lower(AdminUser.username) == payload.new_username.lower(),
                    AdminUser.id != user.id,
                )
            )
        ).scalar_one_or_none()
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ese nombre de usuario ya esta en uso",
            )
        user.username = payload.new_username
        changed_fields.append("username")

    if payload.new_password:
        if verify_password(payload.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contrasena debe ser distinta a la actual",
            )
        user.password_hash = hash_password(payload.new_password)
        changed_fields.append("password")

    if not changed_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay cambios que guardar",
        )

    now = datetime.now(UTC)
    user.updated_at = now
    await session.execute(
        update(AdminSession)
        .where(
            AdminSession.admin_user_id == user.id,
            AdminSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    session.add(
        AuditLog(
            admin_user_id=user.id,
            action="admin.credentials.updated",
            entity_type="admin_user",
            entity_id=str(user.id),
            payload={"changed_fields": changed_fields},
            ip_address=_request_ip(request),
        )
    )
    await session.commit()

    response.delete_cookie("admin_session", path="/", domain=settings.COOKIE_DOMAIN)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


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
