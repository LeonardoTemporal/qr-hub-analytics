from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ServiceCatalog, WorkshopProfile

router = APIRouter(prefix="/public", tags=["public-site"])


@router.get("/site")
async def public_site(session: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    profile = (
        await session.execute(
            select(WorkshopProfile).where(WorkshopProfile.is_published.is_(True)).limit(1)
        )
    ).scalar_one_or_none()
    services = (
        await session.execute(
            select(ServiceCatalog)
            .where(ServiceCatalog.is_active.is_(True))
            .order_by(ServiceCatalog.name)
        )
    ).scalars()
    return {
        "workshop": None
        if not profile
        else {
            "name": profile.name,
            "tagline": profile.tagline,
            "description": profile.description,
            "phone": profile.phone,
            "email": profile.email,
            "city": profile.city,
            "state": profile.state,
            "instagram_url": profile.instagram_url,
        },
        "services": [
            {
                "code": item.code,
                "name": item.name,
                "service_type": item.service_type,
                "description": item.description,
            }
            for item in services
        ],
    }
