"""
Punto de entrada de la aplicación FastAPI – QR-Hub Analytics Backend.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import redirect, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan – startup / shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Crea las tablas al iniciar (conveniente en desarrollo).
    En producción se recomienda usar Alembic para migraciones versionadas.
    """
    logger.info("Starting up QR-Hub Analytics backend…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema verified / created.")

    yield  # ← la app está en ejecución

    logger.info("Shutting down – disposing DB engine…")
    await engine.dispose()


# ---------------------------------------------------------------------------
# Aplicación FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="QR-Hub Analytics API",
    description=(
        "Servicio de redirección instantánea y recolección de analíticas "
        "para QR dinámicos. Desplegado con Dokploy."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS – permitimos frontend local y producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://7fitment.com",
        "https://www.7fitment.com",
        "https://admin.7fitment.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(redirect.router)
app.include_router(analytics.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check – usado por Dokploy / Docker healthcheck
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"], summary="Health Check")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "qr-hub-analytics-backend"}
