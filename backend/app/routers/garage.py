from __future__ import annotations

import secrets
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.domains.garage.security import (
    clear_pin_failures,
    is_pin_locked,
    register_pin_failure,
)
from app.models import (
    EventOutbox,
    MediaAsset,
    ServiceMedia,
    ServiceRecord,
    ShowcaseProfile,
    ShowcaseSocialProof,
    Vehicle,
    VehicleQRCode,
    WarrantyClaim,
    WarrantyClaimMedia,
    WarrantyPolicy,
)
from app.security import (
    create_media_token,
    create_portal_token,
    verify_media_token,
    verify_pin,
    verify_portal_token,
)

router = APIRouter(prefix="/garage", tags=["garage"])
portal_bearer = HTTPBearer(auto_error=True)


class ShowcaseMedia(BaseModel):
    media_url: str
    media_type: str
    caption: str | None = None
    sort_order: int


class ShowcaseService(BaseModel):
    service_type: str
    media: list[ShowcaseMedia]


class ShowcaseVehicle(BaseModel):
    brand: str
    model: str
    year: int | None = None


class ShowcaseProfileView(BaseModel):
    title: str | None = None
    description: str | None = None
    hero_media_url: str | None = None
    instagram_build_url: str | None = None
    whatsapp_cta_url: str | None = None
    book_consultation_url: str | None = None


class ShowcaseSocialProofView(BaseModel):
    client_testimonial: str | None = None
    vehicle_story: str | None = None
    photographer_credit: str | None = None


class ShowcaseResponse(BaseModel):
    vehicle: ShowcaseVehicle
    services: list[ShowcaseService]
    profile: ShowcaseProfileView | None = None
    social_proof: ShowcaseSocialProofView | None = None


class PortalAuthRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=32)
    vehicle_id: str | None = Field(default=None, min_length=1, max_length=160)


class PortalAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    vehicle_id: int


class PortalClient(BaseModel):
    id: int
    full_name: str
    phone: str | None = None
    email: str | None = None
    preferred_contact_channel: str | None = None
    notes: str | None = None


class PortalVehicle(BaseModel):
    id: int
    brand: str
    model: str
    year: int | None = None
    vin: str | None = None
    plate: str | None = None
    color: str | None = None
    is_active: bool


class PortalMedia(BaseModel):
    id: int
    media_url: str
    media_type: str
    caption: str | None = None
    sort_order: int
    is_public: bool


class PortalServiceRecord(BaseModel):
    id: int
    service_type: str
    title: str | None = None
    installed_at: date
    warranty_expires_at: date | None = None
    washing_recommendations: str | None = None
    care_instructions: str | None = None
    internal_notes: str | None = None
    is_public: bool
    media: list[PortalMedia]


class PortalWarranty(BaseModel):
    id: int
    policy_number: str
    service_record_id: int
    status: str
    effective_date: date
    expiration_date: date
    terms_version: int
    policy_snapshot: dict
    workmanship_warranty_years: int | None = None
    workmanship_warranty_expires_at: date | None = None
    drying_method: str | None = None
    water_temperature: str | None = None
    first_wash_after_days: int | None = None
    maintenance_inspection_frequency_months: int | None = None
    covered_areas: dict | None = None
    covered_surfaces: dict | None = None
    annual_inspection_required: bool = False
    warranty_card_number: str | None = None


class PortalClaimEvidence(BaseModel):
    media_asset_id: int
    media_url: str
    media_type: str
    original_filename: str


class PortalWarrantyClaim(BaseModel):
    id: int
    claim_number: str
    warranty_policy_id: int
    status: str
    description: str
    incident_at: date | None = None
    resolution_notes: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    evidence: list[PortalClaimEvidence] = Field(default_factory=list)


class PortalWarrantyClaimCreate(BaseModel):
    warranty_policy_id: int = Field(gt=0)
    description: str = Field(min_length=20, max_length=2000)
    incident_at: date | None = None


class PortalDataResponse(BaseModel):
    client: PortalClient
    vehicle: PortalVehicle
    services: list[PortalServiceRecord]
    warranties: list[PortalWarranty] = Field(default_factory=list)
    warranty_claims: list[PortalWarrantyClaim] = Field(default_factory=list)


def _vehicle_identity_filter(vehicle_id: str):
    if vehicle_id.isdigit():
        return Vehicle.id == int(vehicle_id)
    return or_(
        Vehicle.qr_codes.any(VehicleQRCode.qr_id == vehicle_id),
        Vehicle.qr_codes.any(VehicleQRCode.public_slug == vehicle_id),
    )


def _qr_identity_filter(slug_or_id: str):
    filters = [
        VehicleQRCode.public_slug == slug_or_id,
        VehicleQRCode.qr_id == slug_or_id,
    ]
    if slug_or_id.isdigit():
        filters.append(VehicleQRCode.id == int(slug_or_id))
    return or_(*filters)


async def _load_vehicle_for_portal(
    session: AsyncSession,
    vehicle_id: int,
) -> Vehicle | None:
    return (
        await session.execute(
            select(Vehicle)
            .options(
                selectinload(Vehicle.client),
                selectinload(Vehicle.service_records).selectinload(ServiceRecord.media),
            )
            .where(Vehicle.id == vehicle_id)
        )
    ).scalar_one_or_none()


async def _require_portal_vehicle_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(portal_bearer)],
) -> int:
    payload = verify_portal_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de portal invalido o expirado",
        )
    return int(payload["vehicle_id"])


def _private_media_url(asset_id: int, vehicle_id: int) -> str:
    token = create_media_token(
        asset_id=asset_id,
        vehicle_id=vehicle_id,
        ttl_seconds=settings.MEDIA_TOKEN_TTL_SECONDS,
    )
    return f"/api/garage/media/{asset_id}?token={token}"


def _claim_number() -> str:
    return f"CLM-{datetime.now(UTC):%Y%m%d}-{secrets.token_hex(3).upper()}"


def _media_file(asset: MediaAsset) -> tuple[Path, str]:
    root = Path(settings.MEDIA_ROOT)
    visibility = "public" if asset.visibility == "public" else "private"
    derivatives = root / "derivatives" / visibility
    if asset.media_type == "image":
        candidate = derivatives / f"asset-{asset.id}-lg.webp"
        mime_type = "image/webp"
    elif asset.media_type == "video":
        candidate = derivatives / f"asset-{asset.id}.mp4"
        mime_type = "video/mp4"
    else:
        suffix = Path(asset.storage_key).suffix.lower()
        candidate = derivatives / f"asset-{asset.id}{suffix}"
        mime_type = asset.mime_type
    if candidate.is_file():
        return candidate, mime_type
    return root / asset.storage_key, asset.mime_type


@router.get("/media/{asset_id}", summary="Media publica o privada con firma temporal")
async def get_garage_media(
    asset_id: int,
    session: Annotated[AsyncSession, Depends(get_db)],
    token: str | None = None,
):
    asset = await session.get(MediaAsset, asset_id)
    if not asset or asset.processing_status == "failed":
        raise HTTPException(status_code=404, detail="Media no encontrada")
    if asset.visibility == "public" and asset.public_path:
        return RedirectResponse(asset.public_path, status_code=307)

    if asset.visibility != "public":
        service_vehicle_ids = set(
            (
                await session.execute(
                    select(ServiceRecord.vehicle_id)
                    .join(ServiceMedia, ServiceMedia.service_record_id == ServiceRecord.id)
                    .where(ServiceMedia.media_asset_id == asset.id)
                )
            ).scalars()
        )
        claim_vehicle_ids = set(
            (
                await session.execute(
                    select(WarrantyClaim.vehicle_id)
                    .join(
                        WarrantyClaimMedia,
                        WarrantyClaimMedia.warranty_claim_id == WarrantyClaim.id,
                    )
                    .where(WarrantyClaimMedia.media_asset_id == asset.id)
                )
            ).scalars()
        )
        vehicle_ids = service_vehicle_ids | claim_vehicle_ids
        if not token or not any(
            verify_media_token(
                token,
                asset_id=asset.id,
                vehicle_id=vehicle_id,
            )
            for vehicle_id in vehicle_ids
        ):
            raise HTTPException(status_code=403, detail="Firma de media invalida o expirada")

    path, media_type = _media_file(asset)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Archivo de media no disponible")
    response = FileResponse(
        path,
        media_type=media_type,
        filename=asset.original_filename,
        content_disposition_type="inline",
    )
    response.headers["Cache-Control"] = (
        "public, max-age=2592000, immutable"
        if asset.visibility == "public"
        else "private, no-store"
    )
    return response


@router.get(
    "/showcase/{slug_or_id}",
    response_model=ShowcaseResponse,
    summary="Showcase publico del vehiculo",
)
async def get_vehicle_showcase(
    slug_or_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ShowcaseResponse:
    qr_code = (
        await session.execute(
            select(VehicleQRCode)
            .join(Vehicle)
            .options(
                selectinload(VehicleQRCode.vehicle)
                .selectinload(Vehicle.service_records)
                .selectinload(ServiceRecord.media)
            )
            .where(
                VehicleQRCode.is_active.is_(True),
                Vehicle.is_active.is_(True),
                _qr_identity_filter(slug_or_id),
            )
        )
    ).scalar_one_or_none()

    if not qr_code:
        raise HTTPException(status_code=404, detail="Showcase no encontrado")

    vehicle = qr_code.vehicle
    profile = (
        await session.execute(
            select(ShowcaseProfile).where(
                ShowcaseProfile.vehicle_id == vehicle.id,
                ShowcaseProfile.status == "published",
            )
        )
    ).scalar_one_or_none()
    social_proof = None
    hero_media_url = None
    if profile:
        proof = (
            await session.execute(
                select(ShowcaseSocialProof).where(
                    ShowcaseSocialProof.showcase_profile_id == profile.id
                )
            )
        ).scalar_one_or_none()
        if proof:
            consented = proof.client_approved_at is not None
            social_proof = ShowcaseSocialProofView(
                client_testimonial=(
                    proof.client_testimonial if consented and proof.show_testimonial else None
                ),
                vehicle_story=proof.vehicle_story if consented and proof.show_story else None,
                photographer_credit=(
                    proof.photographer_credit if consented and proof.show_photographer else None
                ),
            )
        if profile.hero_media_asset_id:
            hero_asset = await session.get(MediaAsset, profile.hero_media_asset_id)
            if hero_asset and hero_asset.visibility == "public":
                hero_media_url = hero_asset.public_path
    services = [
        ShowcaseService(
            service_type=service.service_type,
            media=[
                ShowcaseMedia(
                    media_url=media.media_url,
                    media_type=media.media_type,
                    caption=media.caption,
                    sort_order=media.sort_order,
                )
                for media in sorted(service.media, key=lambda item: item.sort_order)
                if media.is_public
            ],
        )
        for service in vehicle.service_records
        if service.is_public
    ]

    return ShowcaseResponse(
        vehicle=ShowcaseVehicle(
            brand=vehicle.brand,
            model=vehicle.model,
            year=vehicle.year,
        ),
        services=services,
        profile=(
            ShowcaseProfileView(
                title=profile.title,
                description=profile.description,
                hero_media_url=hero_media_url,
                instagram_build_url=profile.instagram_build_url,
                whatsapp_cta_url=profile.whatsapp_cta_url,
                book_consultation_url=profile.book_consultation_url,
            )
            if profile
            else None
        ),
        social_proof=social_proof,
    )


@router.post(
    "/portal/auth",
    response_model=PortalAuthResponse,
    summary="Verifica PIN y emite token privado de portal",
)
async def authenticate_portal(
    payload: PortalAuthRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> PortalAuthResponse:
    vehicle: Vehicle | None = None
    if payload.vehicle_id:
        vehicle = (
            await session.execute(
                select(Vehicle).where(_vehicle_identity_filter(payload.vehicle_id))
            )
        ).scalar_one_or_none()
        if not vehicle or not vehicle.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN invalido o acceso revocado",
            )
        if is_pin_locked(vehicle):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Acceso temporalmente bloqueado. Intenta mas tarde.",
                headers={"Retry-After": "900"},
            )
        if not verify_pin(payload.pin, vehicle.access_pin_hash):
            register_pin_failure(vehicle, datetime.now(UTC))
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN invalido o acceso revocado",
            )
    else:
        candidates = (
            await session.execute(select(Vehicle).where(Vehicle.is_active.is_(True)))
        ).scalars()
        for candidate in candidates:
            if verify_pin(payload.pin, candidate.access_pin_hash):
                vehicle = candidate
                break

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN invalido o acceso revocado",
        )

    clear_pin_failures(vehicle)
    await session.commit()

    return PortalAuthResponse(
        access_token=create_portal_token(vehicle.id),
        expires_in=settings.PORTAL_TOKEN_TTL_SECONDS,
        vehicle_id=vehicle.id,
    )


@router.post(
    "/portal/claims",
    response_model=PortalWarrantyClaim,
    status_code=status.HTTP_201_CREATED,
    summary="Registra una reclamacion desde el portal privado",
)
async def create_portal_warranty_claim(
    payload: PortalWarrantyClaimCreate,
    vehicle_id: Annotated[int, Depends(_require_portal_vehicle_id)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> PortalWarrantyClaim:
    policy = (
        await session.execute(
            select(WarrantyPolicy)
            .join(Vehicle, Vehicle.id == WarrantyPolicy.vehicle_id)
            .where(
                WarrantyPolicy.id == payload.warranty_policy_id,
                WarrantyPolicy.vehicle_id == vehicle_id,
                WarrantyPolicy.status.in_(("active", "expired")),
                Vehicle.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Poliza no disponible para este vehiculo",
        )

    incident_at = payload.incident_at or date.today()
    if incident_at < policy.effective_date or incident_at > policy.expiration_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de la incidencia debe estar dentro de la vigencia de la poliza",
        )

    claim = WarrantyClaim(
        claim_number=_claim_number(),
        warranty_policy_id=policy.id,
        vehicle_id=vehicle_id,
        status="submitted",
        description=payload.description.strip(),
        incident_at=incident_at,
    )
    session.add(claim)
    await session.flush()
    session.add(
        EventOutbox(
            topic="warranty.claim.submitted",
            payload={
                "claim_id": claim.id,
                "vehicle_id": vehicle_id,
                "source": "customer_portal",
            },
        )
    )
    await session.commit()
    await session.refresh(claim)

    return PortalWarrantyClaim(
        id=claim.id,
        claim_number=claim.claim_number,
        warranty_policy_id=claim.warranty_policy_id,
        status=claim.status,
        description=claim.description,
        incident_at=claim.incident_at,
        resolution_notes=claim.resolution_notes,
        resolved_at=claim.resolved_at,
        created_at=claim.created_at,
        evidence=[],
    )


@router.get(
    "/portal/data",
    response_model=PortalDataResponse,
    summary="Datos privados del portal de cliente",
)
async def get_portal_data(
    vehicle_id: Annotated[int, Depends(_require_portal_vehicle_id)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> PortalDataResponse:
    vehicle = await _load_vehicle_for_portal(session, vehicle_id)
    if not vehicle or not vehicle.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehiculo no encontrado",
        )

    warranty_rows = (
        await session.execute(
            select(WarrantyPolicy)
            .where(WarrantyPolicy.vehicle_id == vehicle.id)
            .order_by(WarrantyPolicy.effective_date.desc())
        )
    ).scalars()
    warranty_rows = list(warranty_rows)
    claim_rows = list(
        (
            await session.execute(
                select(WarrantyClaim)
                .where(WarrantyClaim.vehicle_id == vehicle.id)
                .order_by(WarrantyClaim.created_at.desc())
            )
        ).scalars()
    )
    service_asset_ids = {
        media.media_asset_id
        for service in vehicle.service_records
        for media in service.media
        if media.media_asset_id is not None
    }
    service_assets = {
        asset.id: asset
        for asset in (
            (
                await session.execute(
                    select(MediaAsset).where(MediaAsset.id.in_(service_asset_ids))
                )
            ).scalars()
            if service_asset_ids
            else []
        )
    }
    claim_evidence_rows = list(
        (
            await session.execute(
                select(WarrantyClaimMedia, MediaAsset)
                .join(MediaAsset, MediaAsset.id == WarrantyClaimMedia.media_asset_id)
                .where(
                    WarrantyClaimMedia.warranty_claim_id.in_([claim.id for claim in claim_rows])
                )
            )
        ).all()
    ) if claim_rows else []
    evidence_by_claim: dict[int, list[PortalClaimEvidence]] = {}
    for link, asset in claim_evidence_rows:
        evidence_by_claim.setdefault(link.warranty_claim_id, []).append(
            PortalClaimEvidence(
                media_asset_id=asset.id,
                media_url=_private_media_url(asset.id, vehicle.id),
                media_type=asset.media_type,
                original_filename=asset.original_filename,
            )
        )

    return PortalDataResponse(
        client=PortalClient(
            id=vehicle.client.id,
            full_name=vehicle.client.full_name,
            phone=vehicle.client.phone,
            email=vehicle.client.email,
            preferred_contact_channel=vehicle.client.preferred_contact_channel,
            notes=vehicle.client.notes,
        ),
        vehicle=PortalVehicle(
            id=vehicle.id,
            brand=vehicle.brand,
            model=vehicle.model,
            year=vehicle.year,
            vin=vehicle.vin,
            plate=vehicle.plate,
            color=vehicle.color,
            is_active=vehicle.is_active,
        ),
        services=[
            PortalServiceRecord(
                id=service.id,
                service_type=service.service_type,
                title=service.title,
                installed_at=service.installed_at,
                warranty_expires_at=service.warranty_expires_at,
                washing_recommendations=service.washing_recommendations,
                care_instructions=service.care_instructions,
                internal_notes=service.internal_notes,
                is_public=service.is_public,
                media=[
                    PortalMedia(
                        id=media.id,
                        media_url=(
                            _private_media_url(media.media_asset_id, vehicle.id)
                            if media.media_asset_id is not None
                            and service_assets.get(media.media_asset_id)
                            and service_assets[media.media_asset_id].visibility == "private"
                            else media.media_url
                        ),
                        media_type=media.media_type,
                        caption=media.caption,
                        sort_order=media.sort_order,
                        is_public=media.is_public,
                    )
                    for media in sorted(service.media, key=lambda item: item.sort_order)
                ],
            )
            for service in vehicle.service_records
        ],
        warranties=[
            PortalWarranty(
                id=policy.id,
                policy_number=policy.policy_number,
                service_record_id=policy.service_record_id,
                status=policy.status,
                effective_date=policy.effective_date,
                expiration_date=policy.expiration_date,
                terms_version=policy.terms_version,
                policy_snapshot=policy.policy_snapshot,
                workmanship_warranty_years=policy.workmanship_warranty_years,
                workmanship_warranty_expires_at=policy.workmanship_warranty_expires_at,
                drying_method=policy.drying_method,
                water_temperature=policy.water_temperature,
                first_wash_after_days=policy.first_wash_after_days,
                maintenance_inspection_frequency_months=(
                    policy.maintenance_inspection_frequency_months
                ),
                covered_areas=policy.covered_areas,
                covered_surfaces=policy.covered_surfaces,
                annual_inspection_required=policy.annual_inspection_required,
                warranty_card_number=policy.warranty_card_number,
            )
            for policy in warranty_rows
        ],
        warranty_claims=[
            PortalWarrantyClaim(
                id=claim.id,
                claim_number=claim.claim_number,
                warranty_policy_id=claim.warranty_policy_id,
                status=claim.status,
                description=claim.description,
                incident_at=claim.incident_at,
                resolution_notes=claim.resolution_notes,
                resolved_at=claim.resolved_at,
                created_at=claim.created_at,
                evidence=evidence_by_claim.get(claim.id, []),
            )
            for claim in claim_rows
        ],
    )
