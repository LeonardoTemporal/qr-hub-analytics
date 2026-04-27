"""
Router de autenticación — endpoint público de login para el dashboard.

POST /api/auth/login
    Body: { "username": "...", "password": "..." }
    200 OK   → { "success": true, "username": "..." }
    401      → { "detail": "Credenciales invalidas" }

El frontend persiste el flag de autenticación en sessionStorage tras
un 200 OK. Las llamadas a /api/analytics/* se hacen luego con HTTP Basic.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import verify_login

logger = logging.getLogger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class LoginResponse(BaseModel):
    success: bool
    username: str


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Login admin del dashboard",
    tags=["auth"],
)
async def login(payload: LoginRequest) -> LoginResponse:
    if not verify_login(payload.username, payload.password):
        logger.warning("Intento de login fallido user=%r", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )
    return LoginResponse(success=True, username=payload.username)
