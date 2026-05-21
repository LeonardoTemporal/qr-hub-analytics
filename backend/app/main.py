"""
Punto de entrada de la aplicación FastAPI – QR-Hub Analytics Backend.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import analytics, auth, garage, redirect

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
    Aplica migraciones idempotentes ligeras (ALTER TABLE IF NOT EXISTS) para
    columnas añadidas a posteriori sobre instalaciones ya en producción.
    En producción a gran escala se recomienda usar Alembic para migraciones versionadas.
    """
    logger.info("Starting up QR-Hub Analytics backend…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migracion idempotente: columnas geo usadas por el dashboard.
        # Postgres soporta ADD COLUMN IF NOT EXISTS desde la 9.6.
        for column in ("country", "state", "city"):
            await conn.execute(
                text(
                    "ALTER TABLE scans "
                    f"ADD COLUMN IF NOT EXISTS {column} VARCHAR(100)"
                )
            )
        await conn.execute(
            text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS geo_source VARCHAR(40)")
        )
        await conn.execute(
            text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_token VARCHAR(120)")
        )
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "ix_scans_scan_token ON scans (scan_token)"
            )
        )
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

# CORS – frontend local (Vite/preview) y producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(redirect.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(garage.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check – usado por Dokploy / Docker healthcheck
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"], summary="Health Check")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "qr-hub-analytics-backend"}
