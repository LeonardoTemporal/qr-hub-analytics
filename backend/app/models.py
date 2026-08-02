from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Double,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
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
    __table_args__ = (
        CheckConstraint(
            "geo_source IN ('ip', 'browser', 'gps')",
            name="ck_scans_geo_source",
        ),
        CheckConstraint(
            "accuracy_meters > 0",
            name="ck_scans_accuracy_positive",
        ),
        CheckConstraint(
            "latitude BETWEEN -90 AND 90",
            name="ck_scans_latitude_range",
        ),
        CheckConstraint(
            "longitude BETWEEN -180 AND 180",
            name="ck_scans_longitude_range",
        ),
        Index(
            "ix_scans_lat_lng",
            "latitude",
            "longitude",
            postgresql_where=text("latitude IS NOT NULL AND longitude IS NOT NULL"),
        ),
        Index("ix_scans_geo_hash_5", "geo_hash_5"),
        Index("ix_scans_geo_hash_7", "geo_hash_7"),
        Index("ix_scans_scanned_at_brin", "scanned_at", postgresql_using="brin"),
    )

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
    latitude: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    accuracy_meters: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    geo_hash_5: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    geo_hash_7: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

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
            f"country={self.country!r} state={self.state!r} lat={self.latitude} "
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
    failed_pin_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pin_locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    media_asset_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("media_assets.id", ondelete="SET NULL"),
        nullable=True,
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


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    admin_user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False
    )
    token_digest: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    csrf_token: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    admin_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("admin_users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(120))
    payload: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ServiceCatalog(Base):
    __tablename__ = "service_catalog"
    __table_args__ = (
        CheckConstraint(
            "service_type IN ('PPF', 'Wrap', 'Ceramic', 'Detailing', 'Maintenance')",
            name="ck_service_catalog_service_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    service_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    default_warranty_months: Mapped[Optional[int]] = mapped_column(Integer)
    base_price_mxn: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','scheduled','in_progress','quality_check','ready','delivered','cancelled')",
            name="ck_work_orders_status",
        ),
        Index("ix_work_orders_vehicle_status", "vehicle_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    client_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=False
    )
    referral_scan_session_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("scan_sessions.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    odometer_km: Mapped[Optional[int]] = mapped_column(Integer)
    intake_notes: Mapped[Optional[str]] = mapped_column(Text)
    quality_notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WorkOrderItem(Base):
    __tablename__ = "work_order_items"
    __table_args__ = (
        CheckConstraint(
            "service_type IN ('PPF', 'Wrap', 'Ceramic', 'Detailing', 'Maintenance')",
            name="ck_work_order_items_service_type",
        ),
        CheckConstraint(
            "status IN ('pending','in_progress','completed','cancelled')",
            name="ck_work_order_items_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    service_catalog_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("service_catalog.id", ondelete="SET NULL")
    )
    service_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    material_brand: Mapped[Optional[str]] = mapped_column(String(120))
    material_product: Mapped[Optional[str]] = mapped_column(String(160))
    finish_type: Mapped[Optional[str]] = mapped_column(String(40))
    price_mxn: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    notes: Mapped[Optional[str]] = mapped_column(Text)


class WarrantyTemplate(Base):
    __tablename__ = "warranty_templates"
    __table_args__ = (
        UniqueConstraint("code", "version", name="uq_warranty_template_version"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    service_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    coverage: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    exclusions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    care_instructions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    workmanship_warranty_years: Mapped[Optional[int]] = mapped_column(Integer)
    manufacturer_warranty_years: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WarrantyPolicy(Base):
    __tablename__ = "warranty_policies"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','active','expired','revoked')",
            name="ck_warranty_policies_status",
        ),
        CheckConstraint(
            "expiration_date >= effective_date + 60",
            name="ck_warranty_profeco_minimum",
        ),
        Index("ix_warranty_policies_covered_areas", "covered_areas", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    policy_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    service_record_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("service_records.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("warranty_templates.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[date] = mapped_column(Date, nullable=False)
    terms_version: Mapped[int] = mapped_column(Integer, nullable=False)
    policy_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    workmanship_warranty_years: Mapped[Optional[int]] = mapped_column(Integer)
    workmanship_warranty_expires_at: Mapped[Optional[date]] = mapped_column(Date)
    drying_method: Mapped[Optional[str]] = mapped_column(String(40))
    water_temperature: Mapped[Optional[str]] = mapped_column(String(40))
    first_wash_after_days: Mapped[Optional[int]] = mapped_column(Integer)
    curing_period_hours: Mapped[Optional[int]] = mapped_column(Integer)
    no_water_hours: Mapped[Optional[int]] = mapped_column(Integer)
    no_detergent_days: Mapped[Optional[int]] = mapped_column(Integer)
    maintenance_inspection_frequency_months: Mapped[Optional[int]] = mapped_column(Integer)
    maintenance_inspection_frequency_days: Mapped[Optional[int]] = mapped_column(Integer)
    covered_areas: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict
    )
    covered_surfaces: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict
    )
    annual_inspection_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    warranty_card_number: Mapped[Optional[str]] = mapped_column(String(80), index=True)
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted','under_review','approved','rejected','resolved','cancelled')",
            name="ck_warranty_claims_status",
        ),
        Index("ix_warranty_claims_vehicle_status", "vehicle_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    claim_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    warranty_policy_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("warranty_policies.id", ondelete="CASCADE"), nullable=False
    )
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="submitted")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    incident_at: Mapped[Optional[date]] = mapped_column(Date)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WarrantyClaimMedia(Base):
    __tablename__ = "warranty_claim_media"
    __table_args__ = (
        UniqueConstraint(
            "warranty_claim_id",
            "media_asset_id",
            name="uq_warranty_claim_media_asset",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    warranty_claim_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("warranty_claims.id", ondelete="CASCADE"), nullable=False
    )
    media_asset_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class MediaAsset(Base):
    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint(
            "visibility IN ('public','private')", name="ck_media_assets_visibility"
        ),
        CheckConstraint(
            "processing_status IN ('pending','processing','ready','failed')",
            name="ck_media_assets_processing_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    media_type: Mapped[str] = mapped_column(String(24), nullable=False)
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    visibility: Mapped[str] = mapped_column(String(16), nullable=False, default="private")
    processing_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    public_path: Mapped[Optional[str]] = mapped_column(Text)
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Numeric(10, 3))
    extra_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ShowcaseProfile(Base):
    __tablename__ = "showcase_profiles"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','published','archived')",
            name="ck_showcase_profiles_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), unique=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    hero_media_asset_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    seo_title: Mapped[Optional[str]] = mapped_column(String(180))
    seo_description: Mapped[Optional[str]] = mapped_column(String(320))
    instagram_build_url: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_cta_url: Mapped[Optional[str]] = mapped_column(Text)
    book_consultation_url: Mapped[Optional[str]] = mapped_column(Text)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ShowcaseSocialProof(Base):
    __tablename__ = "showcase_social_proof"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    showcase_profile_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("showcase_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    client_testimonial: Mapped[Optional[str]] = mapped_column(Text)
    vehicle_story: Mapped[Optional[str]] = mapped_column(Text)
    photographer_credit: Mapped[Optional[str]] = mapped_column(String(160))
    show_testimonial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_story: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_photographer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    client_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    client_approved_ip: Mapped[Optional[str]] = mapped_column(String(45))


class WorkshopProfile(Base):
    __tablename__ = "workshop_profile"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, default="7Fitment")
    tagline: Mapped[Optional[str]] = mapped_column(String(240))
    description: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Mexico")
    latitude: Mapped[Optional[float]] = mapped_column(Double)
    longitude: Mapped[Optional[float]] = mapped_column(Double)
    business_hours: Mapped[Optional[dict]] = mapped_column(JSON)
    service_areas: Mapped[Optional[list]] = mapped_column(JSON)
    instagram_url: Mapped[Optional[str]] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ScanSession(Base):
    __tablename__ = "scan_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    vehicle_qr_code_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("vehicle_qr_codes.id", ondelete="SET NULL")
    )
    attribution_token: Mapped[str] = mapped_column(
        String(120), nullable=False, unique=True, index=True
    )
    landing_path: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_event_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    __table_args__ = (
        Index("ix_analytics_events_session_time", "scan_session_id", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scan_session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("scan_sessions.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    path: Mapped[Optional[str]] = mapped_column(String(255))
    element_id: Mapped[Optional[str]] = mapped_column(String(120))
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(120), unique=True)
    event_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Conversion(Base):
    __tablename__ = "conversions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scan_session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("scan_sessions.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("clients.id", ondelete="SET NULL")
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="SET NULL")
    )
    work_order_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("work_orders.id", ondelete="SET NULL")
    )
    conversion_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    value_mxn: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class EventOutbox(Base):
    __tablename__ = "event_outbox"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    scheduled_for: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[Optional[str]] = mapped_column(String(120))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AnalyticsDailyAggregate(Base):
    __tablename__ = "analytics_daily_aggregates"
    __table_args__ = (
        UniqueConstraint("bucket_date", "campaign_id", name="uq_analytics_daily_bucket"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    bucket_date: Mapped[date] = mapped_column(Date, nullable=False)
    campaign_id: Mapped[str] = mapped_column(String(120), nullable=False)
    scan_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    destination_views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cta_clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    leads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    services: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue_mxn: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AnalyticsMonthlyAggregate(Base):
    __tablename__ = "analytics_monthly_aggregates"
    __table_args__ = (
        UniqueConstraint("bucket_month", "campaign_id", name="uq_analytics_monthly_bucket"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    bucket_month: Mapped[date] = mapped_column(Date, nullable=False)
    campaign_id: Mapped[str] = mapped_column(String(120), nullable=False)
    scan_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    destination_views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cta_clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    leads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    services: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue_mxn: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
