# backend/app/api/public.py
# Endpoints públicos — sin autenticación, con rate limiting
import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.tenant import Tenant
from app.models.service import Service
from app.models.booking import BookingCreatedBy
from app.schemas.availability import SlotListResponse, SlotItem
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService

router = APIRouter(prefix="/public", tags=["public"])


class PublicTenantResponse(BaseModel):
    slug: str
    name: str


class PublicServiceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: float | None

    model_config = {"from_attributes": True}


class PublicPageResponse(BaseModel):
    tenant: PublicTenantResponse
    services: list[PublicServiceResponse]


class PublicBookingRequest(BaseModel):
    service_id: uuid.UUID
    scheduled_at: str  # ISO datetime string
    customer_phone: str
    customer_name: str | None = None


class PublicBookingResponse(BaseModel):
    booking_id: uuid.UUID
    scheduled_at: str
    service_name: str
    status: str


async def _get_tenant_by_slug(slug: str, db: AsyncSession) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Página no encontrada")
    return tenant


@router.get("/{slug}", response_model=PublicPageResponse)
async def get_public_page(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    tenant = await _get_tenant_by_slug(slug, db)
    result = await db.execute(
        select(Service).where(Service.tenant_id == tenant.id, Service.is_active)
    )
    services = list(result.scalars().all())
    return PublicPageResponse(
        tenant=PublicTenantResponse(slug=tenant.slug, name=tenant.name),
        services=[PublicServiceResponse.model_validate(s) for s in services],
    )


@router.get("/{slug}/slots", response_model=SlotListResponse)
async def get_public_slots(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(..., alias="date"),
    service_id: uuid.UUID = Query(...),
):
    tenant = await _get_tenant_by_slug(slug, db)
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.tenant_id == tenant.id,
            Service.is_active,
        )
    )
    service_obj = result.scalar_one_or_none()
    if not service_obj:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    svc = AvailabilityService(db)
    slots = await svc.get_available_slots(tenant.id, target_date, service_obj.duration_minutes)
    return SlotListResponse(date=str(target_date), slots=[SlotItem(**s) for s in slots])


@router.post("/{slug}/book", response_model=PublicBookingResponse, status_code=201)
@limiter.limit("10/minute")
async def create_public_booking(
    request: Request,
    slug: str,
    payload: PublicBookingRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from datetime import datetime, timezone

    tenant = await _get_tenant_by_slug(slug, db)

    result = await db.execute(
        select(Service).where(
            Service.id == payload.service_id,
            Service.tenant_id == tenant.id,
            Service.is_active,
        )
    )
    service_obj = result.scalar_one_or_none()
    if not service_obj:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    try:
        scheduled_at = datetime.fromisoformat(payload.scheduled_at).astimezone(timezone.utc)
    except ValueError:
        raise HTTPException(status_code=422, detail="Formato de fecha inválido")

    if not payload.customer_phone.strip():
        raise HTTPException(status_code=422, detail="Teléfono requerido")

    booking_svc = BookingService(db)
    try:
        booking = await booking_svc.create_booking(
            tenant_id=tenant.id,
            customer_phone=payload.customer_phone.strip(),
            customer_name=payload.customer_name,
            service_id=payload.service_id,
            scheduled_at=scheduled_at,
            created_by=BookingCreatedBy.customer,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return PublicBookingResponse(
        booking_id=booking.id,
        scheduled_at=booking.scheduled_at.isoformat(),
        service_name=service_obj.name,
        status=booking.status.value,
    )
