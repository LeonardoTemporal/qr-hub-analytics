"""FastAPI entry point for the modular 7Fitment platform."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated, AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import engine, get_db
from app.domains.admin import router as admin_router
from app.domains.analytics import router as admin_analytics_router
from app.domains.media import router as media_router
from app.domains.public import router as public_router
from app.domains.tracking import router as tracking_router
from app.domains.workshop import router as workshop_router
from app.request_limits import RequestBodyLimitMiddleware
from app.routers import analytics, auth, garage, redirect

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    """Alembic owns schema changes; application startup performs no DDL."""
    logger.info("Starting QR-Hub Analytics backend")
    yield
    logger.info("Disposing database engine")
    await engine.dispose()


app = FastAPI(
    title="7Fitment Platform API",
    description="QR analytics, workshop operations and Digital Garage.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(
    RequestBodyLimitMiddleware,
    limits={
        "/api/analytics/browser-location": 8_192,
        "/api/tracking/events": 16_384,
    },
)

# Compatibility routers remain available while clients migrate by domain.
app.include_router(redirect.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(garage.router, prefix="/api")

# New bounded domains.
app.include_router(admin_router.router, prefix="/api")
app.include_router(workshop_router.router, prefix="/api")
app.include_router(media_router.router, prefix="/api")
app.include_router(public_router.router, prefix="/api")
app.include_router(tracking_router.router, prefix="/api")
app.include_router(admin_analytics_router.router, prefix="/api")


@app.get("/health", tags=["health"], summary="Health Check")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "7fitment-platform-api"}


@app.get("/ready", tags=["health"], summary="Readiness Check")
async def readiness_check(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Readiness database check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
    return {"status": "ready"}
