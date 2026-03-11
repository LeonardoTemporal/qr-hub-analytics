# -----------------------------------------------------------------------------
# QR-Hub Analytics -- Backend Dockerfile
# Base image: python:3.12-slim  (no dev tools, minimal attack surface)
# -----------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Run as a non-root user for security (principle of least privilege).
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --ingroup appgroup appuser

# ── Dependencies ──────────────────────────────────────────────────────────────
# Copy requirements first to leverage Docker layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application source ────────────────────────────────────────────────────────
COPY --chown=appuser:appgroup . .

# GeoLite2-City.mmdb is injected at runtime via the Docker volume defined in
# docker-compose.yml (./backend/data:/app/data:ro). The service starts
# normally if the file is absent -- analytics fields degrade to NULL.

USER appuser

EXPOSE 8000

# Healthcheck for Docker / Dokploy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
