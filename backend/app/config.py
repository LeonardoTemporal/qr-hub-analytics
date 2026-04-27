from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    DATABASE_URL: str = "postgresql+asyncpg://qrhub:qrhub_secret@postgres:5432/qrhub"
    FRONTEND_URL: str = "http://localhost:3000"
    GEOIP_DB_PATH: str = "/app/GeoLite2-City.mmdb"

    # ── Admin Auth (Dashboard /analytics protegido) ─────────────────────────
    # En producción: definir vía variables de entorno seguras.
    # Nunca exponer estos valores al frontend.
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "7fitment2026"


settings = Settings()
