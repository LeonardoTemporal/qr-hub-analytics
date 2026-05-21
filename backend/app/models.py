from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Scan(Base):
    """
    Registro de un escaneo de QR.

    Campos:
        id           – PK autoincremental.
        campaign_id  – Identificador del QR / campaña (slug).
        country      – Pais resuelto por geolocalizacion IP.
        state        – Estado / subdivision (ej. "Jalisco", "CDMX").
        city         – Ciudad / municipio resuelto por geolocalizacion IP.
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
    scan_token: Mapped[Optional[str]] = mapped_column(
        String(120), nullable=True, unique=True, index=True
    )

    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    geo_source: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

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


class Client(Base):
    """Cliente propietario de uno o varios vehiculos."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    preferred_contact_channel: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    vehicles: Mapped[list["Vehicle"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


class Vehicle(Base):
    """Vehiculo registrado en 7F Digital Garage."""

    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("access_pin_hash", name="uq_vehicles_access_pin_hash"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vin: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True)
    plate: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    access_pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    client: Mapped["Client"] = relationship(back_populates="vehicles")
    qr_codes: Mapped[list["VehicleQRCode"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )
    service_records: Mapped[list["ServiceRecord"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )


class VehicleQRCode(Base):
    """
    QR publico para showcase del vehiculo.

    Esta entidad no concede acceso privado; solo resuelve galeria y resumen
    publico del trabajo.
    """

    __tablename__ = "vehicle_qr_codes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    qr_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    public_slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    activated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_scanned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="qr_codes")


class ServiceRecord(Base):
    """
    Expediente de servicio/poliza.

    Los campos de garantia, recomendaciones y notas internas pertenecen al
    portal privado y se desbloquean por PIN.
    """

    __tablename__ = "service_records"
    __table_args__ = (
        CheckConstraint(
            "service_type IN ('PPF', 'Wrap', 'Ceramic', 'Detailing', 'Maintenance')",
            name="ck_service_records_service_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    service_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    installed_at: Mapped[date] = mapped_column(Date, nullable=False)
    warranty_expires_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    washing_recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    care_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="service_records")
    media: Mapped[list["ServiceMedia"]] = relationship(
        back_populates="service_record", cascade="all, delete-orphan"
    )


class ServiceMedia(Base):
    """Galeria publica/privada asociada a un servicio."""

    __tablename__ = "service_media"
    __table_args__ = (
        CheckConstraint(
            "media_type IN ('image', 'video', 'document')",
            name="ck_service_media_media_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_record_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("service_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    media_url: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str] = mapped_column(String(24), nullable=False, default="image")
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    service_record: Mapped["ServiceRecord"] = relationship(back_populates="media")
