from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models import Client, ServiceMedia, ServiceRecord, Vehicle, VehicleQRCode
from app.security import create_portal_token, verify_pin, verify_portal_token

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


class ShowcaseResponse(BaseModel):
    vehicle: ShowcaseVehicle
    services: list[ShowcaseService]


class PortalAuthRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=32)
    vehicle_id: str = Field(min_length=1, max_length=160)


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


class PortalDataResponse(BaseModel):
    client: PortalClient
    vehicle: PortalVehicle
    services: list[PortalServiceRecord]


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
    vehicle = (
        await session.execute(
            select(Vehicle).where(_vehicle_identity_filter(payload.vehicle_id))
        )
    ).scalar_one_or_none()

    if (
        not vehicle
        or not vehicle.is_active
        or not verify_pin(payload.pin, vehicle.access_pin_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN invalido o acceso revocado",
        )

    return PortalAuthResponse(
        access_token=create_portal_token(vehicle.id),
        expires_in=settings.PORTAL_TOKEN_TTL_SECONDS,
        vehicle_id=vehicle.id,
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
                        media_url=media.media_url,
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
    )
