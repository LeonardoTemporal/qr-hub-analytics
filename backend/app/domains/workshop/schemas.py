from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ClientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)
    preferred_contact_channel: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class ClientRead(ClientCreate, ORMModel):
    id: int
    created_at: datetime


class ClientUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)
    preferred_contact_channel: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class VehicleCreate(BaseModel):
    client_id: int
    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=120)
    year: int | None = Field(default=None, ge=1886, le=2100)
    vin: str | None = Field(default=None, max_length=64)
    plate: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=80)
    access_pin: str = Field(min_length=4, max_length=32)


class VehicleRead(ORMModel):
    id: int
    client_id: int
    brand: str
    model: str
    year: int | None
    vin: str | None
    plate: str | None
    color: str | None
    is_active: bool


class VehicleUpdate(BaseModel):
    client_id: int | None = None
    brand: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    year: int | None = Field(default=None, ge=1886, le=2100)
    vin: str | None = Field(default=None, max_length=64)
    plate: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=80)
    access_pin: str | None = Field(default=None, min_length=4, max_length=32)
    is_active: bool | None = None


class WorkOrderCreate(BaseModel):
    client_id: int
    vehicle_id: int
    scheduled_for: datetime | None = None
    odometer_km: int | None = Field(default=None, ge=0)
    intake_notes: str | None = None
    referral_token: str | None = Field(default=None, min_length=16, max_length=120)


class WorkOrderUpdate(BaseModel):
    status: str | None = None
    scheduled_for: datetime | None = None
    odometer_km: int | None = Field(default=None, ge=0)
    intake_notes: str | None = None
    quality_notes: str | None = None


class WorkOrderRead(ORMModel):
    id: int
    order_number: str
    client_id: int
    vehicle_id: int
    referral_scan_session_id: int | None
    status: str
    scheduled_for: datetime | None
    odometer_km: int | None
    intake_notes: str | None
    quality_notes: str | None
    created_at: datetime


class WorkOrderItemCreate(BaseModel):
    service_catalog_id: int | None = None
    service_type: Literal["PPF", "Wrap", "Ceramic", "Detailing", "Maintenance"]
    title: str = Field(min_length=2, max_length=160)
    material_brand: str | None = Field(default=None, max_length=120)
    material_product: str | None = Field(default=None, max_length=160)
    finish_type: str | None = Field(default=None, max_length=40)
    price_mxn: float | None = Field(default=None, ge=0, le=10_000_000)
    notes: str | None = None


class WorkOrderItemUpdate(BaseModel):
    service_catalog_id: int | None = None
    service_type: Literal["PPF", "Wrap", "Ceramic", "Detailing", "Maintenance"] | None = None
    title: str | None = Field(default=None, min_length=2, max_length=160)
    material_brand: str | None = Field(default=None, max_length=120)
    material_product: str | None = Field(default=None, max_length=160)
    finish_type: str | None = Field(default=None, max_length=40)
    price_mxn: float | None = Field(default=None, ge=0, le=10_000_000)
    status: Literal["pending", "in_progress", "completed", "cancelled"] | None = None
    notes: str | None = None


class WorkOrderItemRead(WorkOrderItemCreate, ORMModel):
    id: int
    work_order_id: int
    status: str


class ServiceRecordCreate(BaseModel):
    vehicle_id: int
    service_type: str
    title: str | None = Field(default=None, max_length=160)
    installed_at: date
    warranty_expires_at: date | None = None
    washing_recommendations: str | None = None
    care_instructions: str | None = None
    internal_notes: str | None = None
    is_public: bool = True


class ServiceRecordRead(ServiceRecordCreate, ORMModel):
    id: int


class ServiceRecordUpdate(BaseModel):
    service_type: Literal["PPF", "Wrap", "Ceramic", "Detailing", "Maintenance"] | None = None
    title: str | None = Field(default=None, max_length=160)
    installed_at: date | None = None
    warranty_expires_at: date | None = None
    washing_recommendations: str | None = None
    care_instructions: str | None = None
    internal_notes: str | None = None
    is_public: bool | None = None


class WarrantyCreate(BaseModel):
    policy_number: str = Field(min_length=1, max_length=64)
    vehicle_id: int
    service_record_id: int
    template_id: int | None = None
    effective_date: date
    expiration_date: date
    coverage: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    care_instructions: list[str] = Field(default_factory=list)
    workmanship_warranty_years: int | None = Field(default=None, ge=0, le=20)
    manufacturer_warranty_years: int | None = Field(default=None, ge=0, le=30)
    workmanship_warranty_expires_at: date | None = None
    drying_method: str | None = Field(default=None, max_length=40)
    water_temperature: str | None = Field(default=None, max_length=40)
    first_wash_after_days: int | None = Field(default=None, ge=0, le=365)
    curing_period_hours: int | None = Field(default=None, ge=0, le=720)
    no_water_hours: int | None = Field(default=None, ge=0, le=720)
    no_detergent_days: int | None = Field(default=None, ge=0, le=365)
    maintenance_inspection_frequency_months: int | None = Field(default=None, ge=1, le=120)
    maintenance_inspection_frequency_days: int | None = Field(default=None, ge=1, le=3650)
    covered_areas: dict = Field(default_factory=dict)
    covered_surfaces: dict = Field(default_factory=dict)
    annual_inspection_required: bool = False
    warranty_card_number: str | None = Field(default=None, max_length=80)

    @field_validator("policy_number", mode="before")
    @classmethod
    def normalize_policy_number(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_profeco_minimum(self) -> "WarrantyCreate":
        if (self.expiration_date - self.effective_date).days < 60:
            raise ValueError("La garantia debe cubrir al menos 60 dias")
        return self


class WarrantyRead(ORMModel):
    id: int
    policy_number: str
    vehicle_id: int
    service_record_id: int
    template_id: int | None
    status: str
    effective_date: date
    expiration_date: date
    terms_version: int
    policy_snapshot: dict
    workmanship_warranty_years: int | None
    workmanship_warranty_expires_at: date | None
    drying_method: str | None
    water_temperature: str | None
    first_wash_after_days: int | None
    curing_period_hours: int | None
    no_water_hours: int | None
    no_detergent_days: int | None
    maintenance_inspection_frequency_months: int | None
    maintenance_inspection_frequency_days: int | None
    covered_areas: dict | None
    covered_surfaces: dict | None
    annual_inspection_required: bool
    warranty_card_number: str | None


class WarrantyUpdate(BaseModel):
    status: Literal["draft", "active", "expired", "revoked"] | None = None
    expiration_date: date | None = None
    workmanship_warranty_expires_at: date | None = None
    warranty_card_number: str | None = Field(default=None, max_length=80)
    annual_inspection_required: bool | None = None


class WarrantyClaimCreate(BaseModel):
    warranty_policy_id: int
    description: str = Field(min_length=10, max_length=5000)
    incident_at: date | None = None
    evidence_media_asset_ids: list[int] = Field(default_factory=list, max_length=20)


class WarrantyClaimUpdate(BaseModel):
    status: Literal[
        "submitted", "under_review", "approved", "rejected", "resolved", "cancelled"
    ] | None = None
    description: str | None = Field(default=None, min_length=10, max_length=5000)
    incident_at: date | None = None
    resolution_notes: str | None = Field(default=None, max_length=5000)


class WarrantyClaimRead(ORMModel):
    id: int
    claim_number: str
    warranty_policy_id: int
    vehicle_id: int
    status: str
    description: str
    incident_at: date | None
    resolution_notes: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    evidence_media_asset_ids: list[int] = Field(default_factory=list)


class QRCodeCreate(BaseModel):
    vehicle_id: int
    public_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    qr_id: str | None = Field(default=None, max_length=120)


class QRCodeRead(ORMModel):
    id: int
    vehicle_id: int
    qr_id: str
    public_slug: str
    is_active: bool


class QRCodeUpdate(BaseModel):
    public_slug: str | None = Field(
        default=None,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        max_length=160,
    )
    is_active: bool | None = None


ServiceType = Literal["PPF", "Wrap", "Ceramic", "Detailing", "Maintenance"]


class ServiceCatalogCreate(BaseModel):
    code: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=2, max_length=160)
    service_type: ServiceType
    description: str | None = None
    default_warranty_months: int | None = Field(default=None, ge=0, le=360)
    base_price_mxn: float | None = Field(default=None, ge=0, le=10_000_000)
    is_active: bool = True


class ServiceCatalogUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    service_type: ServiceType | None = None
    description: str | None = None
    default_warranty_months: int | None = Field(default=None, ge=0, le=360)
    base_price_mxn: float | None = Field(default=None, ge=0, le=10_000_000)
    is_active: bool | None = None


class ServiceCatalogRead(ServiceCatalogCreate, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class WorkshopProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    tagline: str | None = Field(default=None, max_length=240)
    description: str | None = None
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    business_hours: dict | None = None
    service_areas: list | None = None
    instagram_url: str | None = None
    is_published: bool | None = None

    @field_validator("instagram_url")
    @classmethod
    def validate_instagram_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        parsed = urlparse(normalized)
        if (
            parsed.scheme != "https"
            or (parsed.hostname or "").lower()
            not in {"instagram.com", "www.instagram.com"}
        ):
            raise ValueError("instagram_url must use HTTPS on instagram.com")
        return normalized


class WorkshopProfileRead(ORMModel):
    id: int
    name: str
    tagline: str | None
    description: str | None
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    state: str | None
    country: str
    latitude: float | None
    longitude: float | None
    business_hours: dict | None
    service_areas: list | None
    instagram_url: str | None
    is_published: bool
    updated_at: datetime
