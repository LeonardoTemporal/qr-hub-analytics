from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.domains.admin.dependencies import require_admin_session
from app.domains.media.service import build_storage_key, media_type_for
from app.models import AdminUser, BackgroundJob, MediaAsset, ServiceMedia, ServiceRecord

router = APIRouter(prefix="/admin/media", tags=["admin-media"])


class MediaAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    mime_type: str
    media_type: str
    byte_size: int
    visibility: str
    processing_status: str
    public_path: str | None
    service_record_ids: list[int] = Field(default_factory=list)


def _media_read(asset: MediaAsset, service_record_ids: list[int]) -> MediaAssetRead:
    return MediaAssetRead.model_validate(asset).model_copy(
        update={"service_record_ids": service_record_ids}
    )


@router.get("", response_model=list[MediaAssetRead])
async def list_media(
    _: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[MediaAssetRead]:
    assets = list(
        (
            await session.execute(
                select(MediaAsset).order_by(MediaAsset.created_at.desc())
            )
        ).scalars()
    )
    links = list(
        (
            await session.execute(
                select(ServiceMedia.media_asset_id, ServiceMedia.service_record_id).where(
                    ServiceMedia.media_asset_id.in_([asset.id for asset in assets])
                )
            )
        ).all()
    ) if assets else []
    service_ids_by_asset: dict[int, list[int]] = {}
    for media_asset_id, service_record_id in links:
        service_ids_by_asset.setdefault(media_asset_id, []).append(service_record_id)
    return [
        _media_read(asset, service_ids_by_asset.get(asset.id, [])) for asset in assets
    ]


@router.post("", response_model=MediaAssetRead, status_code=201)
async def upload_media(
    file: Annotated[UploadFile, File()],
    user: Annotated[AdminUser, Depends(require_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
    visibility: Annotated[str, Form()] = "private",
    service_record_id: Annotated[int | None, Form()] = None,
) -> MediaAssetRead:
    if visibility not in {"public", "private"}:
        raise HTTPException(status_code=422, detail="Visibilidad invalida")
    if service_record_id and not await session.get(ServiceRecord, service_record_id):
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    mime_type = file.content_type or "application/octet-stream"
    storage_key = build_storage_key(file.filename or "upload.bin")
    destination = Path(settings.MEDIA_ROOT) / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    checksum = hashlib.sha256()
    total = 0
    limit = settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024
    try:
        with destination.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > limit:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archivo demasiado grande")
                checksum.update(chunk)
                handle.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    asset = MediaAsset(
        storage_key=storage_key,
        original_filename=file.filename or "upload.bin",
        mime_type=mime_type,
        media_type=media_type_for(mime_type),
        byte_size=total,
        checksum_sha256=checksum.hexdigest(),
        visibility=visibility,
        processing_status="pending",
    )
    session.add(asset)
    await session.flush()
    session.add(
        BackgroundJob(
            job_type="media.generate_derivatives",
            payload={"media_asset_id": asset.id},
        )
    )
    if service_record_id:
        session.add(
            ServiceMedia(
                service_record_id=service_record_id,
                media_asset_id=asset.id,
                media_url=f"/api/garage/media/{asset.id}",
                media_type=asset.media_type,
                caption=asset.original_filename,
                is_public=visibility == "public",
            )
        )
    await session.commit()
    await session.refresh(asset)
    return _media_read(asset, [service_record_id] if service_record_id else [])
