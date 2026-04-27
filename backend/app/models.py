from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Scan(Base):
    """
    Registro de un escaneo de QR.

    Campos:
        id           – PK autoincremental.
        campaign_id  – Identificador del QR / campaña (slug).
        country      – País resuelto vía GeoLite2.
        state        – Estado / subdivisión (ej. "Jalisco", "CDMX") vía GeoLite2 subdivisions.
        city         – Ciudad / municipio resuelto vía GeoLite2.
        device_type  – mobile | tablet | desktop | other.
        os           – Sistema operativo extraído del User-Agent.
        browser      – Navegador extraído del User-Agent.
        scanned_at   – Timestamp UTC del momento del escaneo.
    """

    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    campaign_id: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    device_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<Scan id={self.id} campaign={self.campaign_id!r} "
            f"country={self.country!r} state={self.state!r} "
            f"city={self.city!r} device={self.device_type!r}>"
        )
