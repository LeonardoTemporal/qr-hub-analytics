from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://qrhub:qrhub_secret@postgres:5432/qrhub"
    FRONTEND_URL: str = "http://localhost:3000"
    GEOIP_API_URL: str = "http://ip-api.com/json"
    GEOIP_TIMEOUT_SECONDS: float = 2.5
    DEFAULT_CAMPAIGN_ID: str = "7fitment"
    TRACKING_ANALYTICS_CAMPAIGNS: str = "qr_general"
    TRACKING_WHATSAPP_URL: str = (
        "https://wa.me/5215637940104"
        "?text=Hola%207Fitment%2C%20quiero%20cotizar%20un%20proyecto%20para%20mi%20auto"
    )
    TRACKING_INSTAGRAM_URL: str = "https://www.instagram.com/7fitment/"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://7fitment.com",
        "https://www.7fitment.com",
        "https://admin.7fitment.com",
    ]

    # ── Admin Auth (Dashboard /analytics protegido) ─────────────────────────
    # En producción: definir vía variables de entorno seguras.
    # Nunca exponer estos valores al frontend.
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "7fitment2026"
    PORTAL_TOKEN_SECRET: str | None = None
    PORTAL_TOKEN_TTL_SECONDS: int = 1800

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def enlaces_url(self) -> str:
        return f"{self.FRONTEND_URL.rstrip('/')}/enlaces"

    @property
    def tracking_analytics_campaigns(self) -> set[str]:
        return {
            campaign.strip().lower()
            for campaign in self.TRACKING_ANALYTICS_CAMPAIGNS.split(",")
            if campaign.strip()
        }

    @property
    def tracking_destinations(self) -> dict[str, str]:
        return {
            "web_whatsapp": self.TRACKING_WHATSAPP_URL,
            "web_instagram": self.TRACKING_INSTAGRAM_URL,
        }


settings = Settings()
