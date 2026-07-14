from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import (
    Client,
    Scan,
    ServiceMedia,
    ServiceRecord,
    ShowcaseProfile,
    Vehicle,
    VehicleQRCode,
    WarrantyPolicy,
    WorkOrder,
    WorkOrderItem,
)
from app.security import hash_pin


UAT_CLIENT_EMAIL = "release-uat@7fitment.invalid"
UAT_VEHICLE_VIN = "UAT7F911GT3RS2026"
UAT_QR_ID = "uat-vehicle-qr"
UAT_PUBLIC_SLUG = "uat-porsche-gt3"


@dataclass(frozen=True)
class UATSpec:
    client_email: str
    vehicle_vin: str
    qr_id: str
    public_slug: str
    installed_at: date
    warranty_expires_at: date
    media_urls: tuple[str, ...]


@dataclass(frozen=True)
class UATSeedResult:
    vehicle_id: int
    warranty_policy_id: int
    qr_id: str
    public_slug: str


def build_uat_spec(release_date: date | None = None) -> UATSpec:
    effective_date = release_date or date.today()
    installed_at = effective_date - timedelta(days=30)
    return UATSpec(
        client_email=UAT_CLIENT_EMAIL,
        vehicle_vin=UAT_VEHICLE_VIN,
        qr_id=UAT_QR_ID,
        public_slug=UAT_PUBLIC_SLUG,
        installed_at=installed_at,
        warranty_expires_at=installed_at + timedelta(days=5 * 365),
        media_urls=(
            "/assets/media/work/porsche-yellow-lg.webp",
            "/assets/media/work/aura-porsche-yellow-lg.webp",
            "/assets/media/work/r8-plata-mate-lg.webp",
        ),
    )


def validate_uat_pin(pin: str) -> str:
    normalized = pin.strip()
    if len(normalized) < 5:
        raise ValueError("UAT PIN must contain at least 5 characters")
    return normalized


async def _delete_uat_records(session: AsyncSession) -> None:
    vehicle_id = (
        await session.execute(select(Vehicle.id).where(Vehicle.vin == UAT_VEHICLE_VIN))
    ).scalar_one_or_none()

    await session.execute(delete(Scan).where(Scan.campaign_id == UAT_QR_ID))
    if vehicle_id is not None:
        await session.execute(delete(WorkOrder).where(WorkOrder.vehicle_id == vehicle_id))
        await session.execute(delete(Vehicle).where(Vehicle.id == vehicle_id))
    await session.execute(delete(Client).where(Client.email == UAT_CLIENT_EMAIL))


async def seed_uat(pin: str, *, release_date: date | None = None) -> UATSeedResult:
    spec = build_uat_spec(release_date)
    normalized_pin = validate_uat_pin(pin)
    now = datetime.now(UTC)

    async with AsyncSessionLocal() as session:
        await _delete_uat_records(session)

        client = Client(
            full_name="Expediente UAT 7Fitment",
            phone=None,
            email=spec.client_email,
            preferred_contact_channel="whatsapp",
            notes="Registro sintetico reservado para pruebas de aceptacion.",
        )
        session.add(client)
        await session.flush()

        vehicle = Vehicle(
            client_id=client.id,
            brand="Porsche",
            model="911 GT3 RS",
            year=2024,
            vin=spec.vehicle_vin,
            plate="UAT-7F",
            color="Negro mate",
            access_pin_hash=hash_pin(normalized_pin),
            is_active=True,
        )
        session.add(vehicle)
        await session.flush()

        qr_code = VehicleQRCode(
            vehicle_id=vehicle.id,
            qr_id=spec.qr_id,
            public_slug=spec.public_slug,
            is_active=True,
            activated_at=now,
        )
        service = ServiceRecord(
            vehicle_id=vehicle.id,
            service_type="PPF",
            title="PPF completo mate + cobertura ceramica",
            installed_at=spec.installed_at,
            warranty_expires_at=spec.warranty_expires_at,
            washing_recommendations=(
                "Lavado manual con shampoo pH neutro, microfibra limpia y secado sin friccion."
            ),
            care_instructions=(
                "Evitar autolavados de cepillo, solventes y alta presion directa sobre bordes."
            ),
            internal_notes="Expediente sintetico. No corresponde a un cliente comercial.",
            is_public=True,
        )
        session.add_all([qr_code, service])
        await session.flush()

        for sort_order, media_url in enumerate(spec.media_urls):
            session.add(
                ServiceMedia(
                    service_record_id=service.id,
                    media_url=media_url,
                    media_type="image",
                    caption="Imagen de referencia del banco visual 7Fitment",
                    sort_order=sort_order,
                    is_public=True,
                )
            )

        order = WorkOrder(
            order_number="UAT-7F-RELEASE",
            client_id=client.id,
            vehicle_id=vehicle.id,
            status="delivered",
            scheduled_for=now - timedelta(days=35),
            started_at=now - timedelta(days=32),
            completed_at=now - timedelta(days=30),
            delivered_at=now - timedelta(days=29),
            odometer_km=1250,
            intake_notes="Validacion de recepcion y diagnostico de superficie.",
            quality_notes="Control de bordes, acabado y entrega verificados.",
        )
        session.add(order)
        await session.flush()
        session.add(
            WorkOrderItem(
                work_order_id=order.id,
                service_type="PPF",
                title="PPF completo mate + cobertura ceramica",
                material_brand="Material de demostracion",
                material_product="PPF mate premium",
                finish_type="mate",
                price_mxn=Decimal("185000.00"),
                status="completed",
                notes="Partida sintetica para recorrido UAT.",
            )
        )

        policy = WarrantyPolicy(
            policy_number="UAT-7F-POLICY-001",
            vehicle_id=vehicle.id,
            service_record_id=service.id,
            status="active",
            effective_date=spec.installed_at,
            expiration_date=spec.warranty_expires_at,
            terms_version=1,
            policy_snapshot={
                "coverage": ["instalacion", "adherencia", "acabado"],
                "exclusions": ["impacto", "uso indebido", "quimicos abrasivos"],
                "care": "Lavado manual con productos pH neutro.",
                "fixture": "uat",
            },
            workmanship_warranty_years=5,
            workmanship_warranty_expires_at=spec.warranty_expires_at,
            drying_method="microfibra",
            water_temperature="fria",
            first_wash_after_days=7,
            curing_period_hours=72,
            no_water_hours=72,
            no_detergent_days=7,
            maintenance_inspection_frequency_months=12,
            covered_areas={"body": True, "edges": True},
            covered_surfaces={"paint": True},
            annual_inspection_required=True,
            warranty_card_number="UAT-7F-CARD-001",
            issued_at=now - timedelta(days=29),
        )
        profile = ShowcaseProfile(
            vehicle_id=vehicle.id,
            title="Porsche 911 GT3 RS / PPF Mate",
            description=(
                "Expediente demostrativo del proceso de proteccion y acabado 7Fitment."
            ),
            status="published",
            seo_title="Porsche 911 GT3 RS protegido por 7Fitment",
            seo_description="Showcase demostrativo de PPF mate y proteccion ceramica.",
            published_at=now,
        )
        session.add_all([policy, profile])
        await session.commit()

        return UATSeedResult(
            vehicle_id=vehicle.id,
            warranty_policy_id=policy.id,
            qr_id=spec.qr_id,
            public_slug=spec.public_slug,
        )


async def cleanup_uat() -> None:
    async with AsyncSessionLocal() as session:
        await _delete_uat_records(session)
        await session.commit()
