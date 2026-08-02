"""Compatibility aliases for clients migrating to database-backed admin sessions."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.domains.admin.router import AdminLoginRequest
from app.domains.admin.router import login as admin_login
from app.models import AdminUser

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=200)


class LoginResponse(BaseModel):
    success: bool
    username: str


@router.post("/auth/login", response_model=LoginResponse, deprecated=True, tags=["auth"])
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LoginResponse:
    admin_session = await admin_login(
        AdminLoginRequest(username=payload.username, password=payload.password),
        request,
        response,
        session,
    )
    return LoginResponse(success=True, username=admin_session.username)


@router.get("/auth/session", response_model=LoginResponse, deprecated=True, tags=["auth"])
async def current_session(
    user: Annotated[AdminUser, Depends(require_admin_session)],
) -> LoginResponse:
    return LoginResponse(success=True, username=user.username)
