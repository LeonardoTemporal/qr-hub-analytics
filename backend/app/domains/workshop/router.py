from __future__ import annotations

import secrets
from datetime import UTC, timedelta, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.domains.warranties.service import build_policy_snapshot
from app.domains.workshop.schemas import (
    ClientCreate,
    ClientRead,
    ClientUpdate,
    QRCodeCreate,
    QRCodeRead,
    QRCodeUpdate,
    ServiceRecordCreate,
    ServiceRecordRead,
    ServiceRecordUpdate,
    ServiceCatalogCreate,
    ServiceCatalogRead,
    ServiceCatalogUpdate,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
    WarrantyClaimCreate,
    WarrantyClaimRead,
    WarrantyClaimUpdate,
    WarrantyCreate,
    WarrantyRead,
    WarrantyUpdate,
    WorkOrderCreate,
    WorkOrderItemCreate,
    WorkOrderItemRead,
    WorkOrderItemUpdate,
    WorkOrderRead,
    WorkOrderUpdate,
    WorkshopProfileRead,
    WorkshopProfileUpdate,
)
from app.domains.workshop.service import (
    can_transition_warranty_claim,
    can_transition_work_order,
)
from app.models import (
    AdminUser,
    AuditLog,
    Client,
    Conversion,
    EventOutbox,
    MediaAsset,
    ServiceMedia,
    ServiceRecord,
    ServiceCatalog,
    ScanSession,
    ShowcaseProfile,
    Vehicle,
    VehicleQRCode,
    WarrantyClaim,
    WarrantyClaimMedia,
    WarrantyPolicy,
    WarrantyTemplate,
    WorkOrder,
    WorkOrderItem,
    WorkshopProfile,
)
from app.security import hash_pin

router = APIRouter(prefix="/admin", tags=["admin-workshop"])


def _stamp(prefix: str) -> str:
    return f"{prefix}-{datetime.now(UTC):%Y%m%d}-{secrets.token_hex(3).upper()}"


def _audit(
    session: AsyncSession,
    user: AdminUser,
    action: str,
    entity_type: str,
    entity_id: int | str,
) -> None:
    session.add(
        AuditLog(
            admin_user_id=user.id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
        )
    )


@router.get("/clients", response_model=list[ClientRead])
async def list_clients(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[Client]:
    return list((await session.execute(select(Client).order_by(Client.created_at.desc()))).scalars())


@router.post("/clients", response_model=ClientRead, status_code=201)
async def create_client(
    payload: ClientCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Client:
    client = Client(**payload.model_dump())
    session.add(client)
    await session.flush()
    _audit(session, user, "created", "client", client.id)
    await session.commit()
    await session.refresh(client)
    return client


@router.patch("/clients/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: int,
    payload: ClientUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Client:
    client = await session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    client.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "client", client.id)
    await session.commit()
    await session.refresh(client)
    return client


@router.get("/vehicles", response_model=list[VehicleRead])
async def list_vehicles(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[Vehicle]:
    return list((await session.execute(select(Vehicle).order_by(Vehicle.created_at.desc()))).scalars())


@router.post("/vehicles", response_model=VehicleRead, status_code=201)
async def create_vehicle(
    payload: VehicleCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Vehicle:
    values = payload.model_dump(exclude={"access_pin"})
    vehicle = Vehicle(**values, access_pin_hash=hash_pin(payload.access_pin))
    session.add(vehicle)
    await session.flush()
    _audit(session, user, "created", "vehicle", vehicle.id)
    await session.commit()
    await session.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleRead)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Vehicle:
    vehicle = await session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    values = payload.model_dump(exclude_unset=True)
    access_pin = values.pop("access_pin", None)
    if access_pin:
        vehicle.access_pin_hash = hash_pin(access_pin)
        vehicle.failed_pin_attempts = 0
        vehicle.pin_locked_until = None
    for key, value in values.items():
        setattr(vehicle, key, value)
    vehicle.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "vehicle", vehicle.id)
    await session.commit()
    await session.refresh(vehicle)
    return vehicle


@router.get("/work-orders", response_model=list[WorkOrderRead])
async def list_work_orders(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[WorkOrder]:
    return list((await session.execute(select(WorkOrder).order_by(WorkOrder.created_at.desc()))).scalars())


@router.post("/work-orders", response_model=WorkOrderRead, status_code=201)
async def create_work_order(
    payload: WorkOrderCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkOrder:
    referral_token = payload.referral_token
    referral_session = None
    if referral_token:
        referral_session = (
            await session.execute(
                select(ScanSession).where(
                    ScanSession.attribution_token == referral_token,
                    ScanSession.expires_at > datetime.now(UTC),
                )
            )
        ).scalar_one_or_none()
        if not referral_session:
            raise HTTPException(status_code=422, detail="Atribucion QR invalida o expirada")
    values = payload.model_dump(exclude={"referral_token"})
    order = WorkOrder(
        order_number=_stamp("7F"),
        referral_scan_session_id=referral_session.id if referral_session else None,
        **values,
    )
    session.add(order)
    await session.flush()
    if referral_session:
        session.add(
            Conversion(
                scan_session_id=referral_session.id,
                client_id=order.client_id,
                vehicle_id=order.vehicle_id,
                work_order_id=order.id,
                conversion_type="work_order",
            )
        )
    _audit(session, user, "created", "work_order", order.id)
    session.add(EventOutbox(topic="work_order.created", payload={"work_order_id": order.id}))
    await session.commit()
    await session.refresh(order)
    return order


@router.patch("/work-orders/{work_order_id}", response_model=WorkOrderRead)
async def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkOrder:
    order = await session.get(WorkOrder, work_order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    values = payload.model_dump(exclude_unset=True)
    next_status = values.pop("status", None)
    if next_status and next_status != order.status:
        if not can_transition_work_order(order.status, next_status):
            raise HTTPException(status_code=409, detail="Transicion de estado invalida")
        order.status = next_status
        if next_status == "in_progress" and not order.started_at:
            order.started_at = datetime.now(UTC)
        elif next_status == "delivered":
            order.delivered_at = datetime.now(UTC)
    for key, value in values.items():
        setattr(order, key, value)
    _audit(session, user, "updated", "work_order", order.id)
    await session.commit()
    await session.refresh(order)
    return order


@router.get(
    "/work-orders/{work_order_id}/items",
    response_model=list[WorkOrderItemRead],
)
async def list_work_order_items(
    work_order_id: int,
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[WorkOrderItem]:
    return list(
        (
            await session.execute(
                select(WorkOrderItem)
                .where(WorkOrderItem.work_order_id == work_order_id)
                .order_by(WorkOrderItem.id)
            )
        ).scalars()
    )


@router.post(
    "/work-orders/{work_order_id}/items",
    response_model=WorkOrderItemRead,
    status_code=201,
)
async def create_work_order_item(
    work_order_id: int,
    payload: WorkOrderItemCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkOrderItem:
    if not await session.get(WorkOrder, work_order_id):
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    item = WorkOrderItem(
        work_order_id=work_order_id,
        status="pending",
        **payload.model_dump(),
    )
    session.add(item)
    await session.flush()
    _audit(session, user, "created", "work_order_item", item.id)
    await session.commit()
    await session.refresh(item)
    return item


@router.patch("/work-order-items/{item_id}", response_model=WorkOrderItemRead)
async def update_work_order_item(
    item_id: int,
    payload: WorkOrderItemUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkOrderItem:
    item = await session.get(WorkOrderItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    _audit(session, user, "updated", "work_order_item", item.id)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("/services", response_model=list[ServiceRecordRead])
async def list_services(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[ServiceRecord]:
    return list((await session.execute(select(ServiceRecord).order_by(ServiceRecord.created_at.desc()))).scalars())


@router.post("/services", response_model=ServiceRecordRead, status_code=201)
async def create_service(
    payload: ServiceRecordCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ServiceRecord:
    record = ServiceRecord(**payload.model_dump())
    session.add(record)
    await session.flush()
    _audit(session, user, "created", "service_record", record.id)
    await session.commit()
    await session.refresh(record)
    return record


@router.patch("/services/{service_record_id}", response_model=ServiceRecordRead)
async def update_service(
    service_record_id: int,
    payload: ServiceRecordUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ServiceRecord:
    record = await session.get(ServiceRecord, service_record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    record.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "service_record", record.id)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/warranties", response_model=list[WarrantyRead])
async def list_warranties(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[WarrantyPolicy]:
    return list((await session.execute(select(WarrantyPolicy).order_by(WarrantyPolicy.created_at.desc()))).scalars())


@router.post("/warranties", response_model=WarrantyRead, status_code=201)
async def create_warranty(
    payload: WarrantyCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WarrantyPolicy:
    existing_policy = (
        await session.execute(
            select(WarrantyPolicy.id).where(
                WarrantyPolicy.policy_number == payload.policy_number
            )
        )
    ).scalar_one_or_none()
    if existing_policy is not None:
        raise HTTPException(status_code=409, detail="El numero de poliza ya existe")

    template = await session.get(WarrantyTemplate, payload.template_id) if payload.template_id else None
    snapshot = build_policy_snapshot(
        template_code=template.code if template else "custom",
        template_version=template.version if template else 1,
        coverage=template.coverage if template else payload.coverage,
        exclusions=template.exclusions if template else payload.exclusions,
        care_instructions=template.care_instructions if template else payload.care_instructions,
        workmanship_warranty_years=(
            template.workmanship_warranty_years if template else payload.workmanship_warranty_years
        ),
        manufacturer_warranty_years=(
            template.manufacturer_warranty_years if template else payload.manufacturer_warranty_years
        ),
    )
    policy_fields = {
        "workmanship_warranty_years",
        "workmanship_warranty_expires_at",
        "drying_method",
        "water_temperature",
        "first_wash_after_days",
        "curing_period_hours",
        "no_water_hours",
        "no_detergent_days",
        "maintenance_inspection_frequency_months",
        "maintenance_inspection_frequency_days",
        "covered_areas",
        "covered_surfaces",
        "annual_inspection_required",
        "warranty_card_number",
    }
    policy_details = payload.model_dump(include=policy_fields, mode="json")
    snapshot["policy_details"] = policy_details
    policy = WarrantyPolicy(
        policy_number=payload.policy_number,
        vehicle_id=payload.vehicle_id,
        service_record_id=payload.service_record_id,
        template_id=payload.template_id,
        status="active",
        effective_date=payload.effective_date,
        expiration_date=payload.expiration_date,
        terms_version=snapshot["template_version"],
        policy_snapshot=snapshot,
        **payload.model_dump(include=policy_fields),
        issued_at=datetime.now(UTC),
    )
    session.add(policy)
    await session.flush()
    _audit(session, user, "issued", "warranty_policy", policy.id)
    session.add(EventOutbox(topic="warranty.issued", payload={"warranty_policy_id": policy.id}))
    await session.commit()
    await session.refresh(policy)
    return policy


@router.patch("/warranties/{warranty_id}", response_model=WarrantyRead)
async def update_warranty(
    warranty_id: int,
    payload: WarrantyUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WarrantyPolicy:
    policy = await session.get(WarrantyPolicy, warranty_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Poliza no encontrada")
    values = payload.model_dump(exclude_unset=True)
    expiration_date = values.get("expiration_date")
    if expiration_date and expiration_date < policy.effective_date + timedelta(days=60):
        raise HTTPException(status_code=422, detail="La garantia debe cubrir al menos 60 dias")
    for key, value in values.items():
        setattr(policy, key, value)
    policy.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "warranty_policy", policy.id)
    await session.commit()
    await session.refresh(policy)
    return policy


async def _claim_read(
    session: AsyncSession,
    claim: WarrantyClaim,
) -> WarrantyClaimRead:
    media_ids = list(
        (
            await session.execute(
                select(WarrantyClaimMedia.media_asset_id).where(
                    WarrantyClaimMedia.warranty_claim_id == claim.id
                )
            )
        ).scalars()
    )
    return WarrantyClaimRead.model_validate(claim).model_copy(
        update={"evidence_media_asset_ids": media_ids}
    )


@router.get("/warranty-claims", response_model=list[WarrantyClaimRead])
async def list_warranty_claims(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[WarrantyClaimRead]:
    claims = list(
        (
            await session.execute(
                select(WarrantyClaim).order_by(WarrantyClaim.created_at.desc())
            )
        ).scalars()
    )
    return [await _claim_read(session, claim) for claim in claims]


@router.post("/warranty-claims", response_model=WarrantyClaimRead, status_code=201)
async def create_warranty_claim(
    payload: WarrantyClaimCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WarrantyClaimRead:
    policy = await session.get(WarrantyPolicy, payload.warranty_policy_id)
    if not policy or policy.status not in {"active", "expired"}:
        raise HTTPException(status_code=422, detail="Poliza no disponible para reclamacion")
    requested_ids = set(payload.evidence_media_asset_ids)
    if requested_ids:
        assets = list(
            (
                await session.execute(
                    select(MediaAsset)
                    .join(ServiceMedia, ServiceMedia.media_asset_id == MediaAsset.id)
                    .join(
                        ServiceRecord,
                        ServiceRecord.id == ServiceMedia.service_record_id,
                    )
                    .where(
                        MediaAsset.id.in_(requested_ids),
                        ServiceRecord.vehicle_id == policy.vehicle_id,
                    )
                    .distinct()
                )
            ).scalars()
        )
        if {asset.id for asset in assets} != requested_ids:
            raise HTTPException(
                status_code=422,
                detail="La evidencia debe pertenecer a un servicio del mismo vehiculo",
            )
        if any(asset.visibility != "private" for asset in assets):
            raise HTTPException(status_code=422, detail="La evidencia debe ser privada")
    claim = WarrantyClaim(
        claim_number=_stamp("CLM"),
        warranty_policy_id=policy.id,
        vehicle_id=policy.vehicle_id,
        status="submitted",
        description=payload.description,
        incident_at=payload.incident_at,
    )
    session.add(claim)
    await session.flush()
    for media_asset_id in requested_ids:
        session.add(
            WarrantyClaimMedia(
                warranty_claim_id=claim.id,
                media_asset_id=media_asset_id,
            )
        )
    _audit(session, user, "submitted", "warranty_claim", claim.id)
    session.add(EventOutbox(topic="warranty.claim.submitted", payload={"claim_id": claim.id}))
    await session.commit()
    await session.refresh(claim)
    return await _claim_read(session, claim)


@router.patch("/warranty-claims/{claim_id}", response_model=WarrantyClaimRead)
async def update_warranty_claim(
    claim_id: int,
    payload: WarrantyClaimUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WarrantyClaimRead:
    claim = await session.get(WarrantyClaim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Reclamacion no encontrada")
    values = payload.model_dump(exclude_unset=True)
    next_status = values.pop("status", None)
    if next_status and next_status != claim.status:
        if not can_transition_warranty_claim(claim.status, next_status):
            raise HTTPException(status_code=409, detail="Transicion de reclamacion invalida")
        claim.status = next_status
        claim.resolved_at = datetime.now(UTC) if next_status == "resolved" else None
    for key, value in values.items():
        setattr(claim, key, value)
    claim.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "warranty_claim", claim.id)
    session.add(
        EventOutbox(
            topic="warranty.claim.updated",
            payload={"claim_id": claim.id, "status": claim.status},
        )
    )
    await session.commit()
    await session.refresh(claim)
    return await _claim_read(session, claim)


@router.get("/qr-codes", response_model=list[QRCodeRead])
async def list_qr_codes(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[VehicleQRCode]:
    return list((await session.execute(select(VehicleQRCode).order_by(VehicleQRCode.created_at.desc()))).scalars())


@router.post("/qr-codes", response_model=QRCodeRead, status_code=201)
async def create_qr_code(
    payload: QRCodeCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> VehicleQRCode:
    qr = VehicleQRCode(
        vehicle_id=payload.vehicle_id,
        public_slug=payload.public_slug,
        qr_id=payload.qr_id or f"auto_{secrets.token_urlsafe(8)}",
        is_active=True,
        activated_at=datetime.now(UTC),
    )
    session.add(qr)
    await session.flush()
    _audit(session, user, "created", "vehicle_qr_code", qr.id)
    await session.commit()
    await session.refresh(qr)
    return qr


@router.patch("/qr-codes/{qr_code_id}", response_model=QRCodeRead)
async def update_qr_code(
    qr_code_id: int,
    payload: QRCodeUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> VehicleQRCode:
    qr = await session.get(VehicleQRCode, qr_code_id)
    if not qr:
        raise HTTPException(status_code=404, detail="Codigo QR no encontrado")
    values = payload.model_dump(exclude_unset=True)
    next_active = values.pop("is_active", None)
    for key, value in values.items():
        setattr(qr, key, value)
    if next_active is not None and next_active != qr.is_active:
        qr.is_active = next_active
        if next_active:
            qr.activated_at = datetime.now(UTC)
            qr.revoked_at = None
        else:
            qr.revoked_at = datetime.now(UTC)
    _audit(session, user, "updated", "vehicle_qr_code", qr.id)
    await session.commit()
    await session.refresh(qr)
    return qr


@router.get("/service-catalog", response_model=list[ServiceCatalogRead])
async def list_service_catalog(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[ServiceCatalog]:
    return list((await session.execute(select(ServiceCatalog).order_by(ServiceCatalog.name))).scalars())


@router.post("/service-catalog", response_model=ServiceCatalogRead, status_code=201)
async def create_service_catalog_item(
    payload: ServiceCatalogCreate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ServiceCatalog:
    existing = await session.scalar(select(ServiceCatalog.id).where(ServiceCatalog.code == payload.code))
    if existing:
        raise HTTPException(status_code=409, detail="El codigo de servicio ya existe")
    item = ServiceCatalog(**payload.model_dump())
    session.add(item)
    await session.flush()
    _audit(session, user, "created", "service_catalog", item.id)
    await session.commit()
    await session.refresh(item)
    return item


@router.patch("/service-catalog/{service_id}", response_model=ServiceCatalogRead)
async def update_service_catalog_item(
    service_id: int,
    payload: ServiceCatalogUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ServiceCatalog:
    item = await session.get(ServiceCatalog, service_id)
    if not item:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    item.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "service_catalog", item.id)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("/workshop-profile", response_model=WorkshopProfileRead | None)
async def get_workshop_profile(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkshopProfile | None:
    return (await session.execute(select(WorkshopProfile).order_by(WorkshopProfile.id).limit(1))).scalar_one_or_none()


@router.patch("/workshop-profile", response_model=WorkshopProfileRead)
async def update_workshop_profile(
    payload: WorkshopProfileUpdate,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkshopProfile:
    profile = (
        await session.execute(select(WorkshopProfile).order_by(WorkshopProfile.id).limit(1))
    ).scalar_one_or_none()
    if not profile:
        profile = WorkshopProfile(name="7Fitment")
        session.add(profile)
        await session.flush()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    profile.updated_at = datetime.now(UTC)
    _audit(session, user, "updated", "workshop_profile", profile.id)
    await session.commit()
    await session.refresh(profile)
    return profile


@router.post("/showcases/{vehicle_id}/publish")
async def publish_showcase(
    vehicle_id: int,
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    profile = (
        await session.execute(select(ShowcaseProfile).where(ShowcaseProfile.vehicle_id == vehicle_id))
    ).scalar_one_or_none()
    if not profile:
        profile = ShowcaseProfile(vehicle_id=vehicle_id)
        session.add(profile)
        await session.flush()
    profile.status = "published"
    profile.published_at = datetime.now(UTC)
    _audit(session, user, "published", "showcase_profile", profile.id)
    session.add(EventOutbox(topic="showcase.published", payload={"vehicle_id": vehicle_id}))
    await session.commit()
    return {"vehicle_id": vehicle_id, "status": "published"}
