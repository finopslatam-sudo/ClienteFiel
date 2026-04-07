import uuid
from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.booking import BookingStatus, BookingCreatedBy
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreateRequest, BookingResponse, BookingListResponse

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    payload: BookingCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.create_booking(
            tenant_id=current_tenant.id,
            customer_phone=payload.customer_phone,
            customer_name=payload.customer_name,
            service_id=payload.service_id,
            scheduled_at=payload.scheduled_at,
            created_by=BookingCreatedBy.admin,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return BookingResponse.model_validate(booking)


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: BookingStatus | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
):
    service = BookingService(db)
    bookings = await service.list_bookings(
        tenant_id=current_tenant.id,
        status=status,
        date_from=date_from,
        date_to=date_to,
    )
    return BookingListResponse(
        bookings=[BookingResponse.model_validate(b) for b in bookings],
        total=len(bookings),
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    booking = await service.get_booking(current_tenant.id, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.canceled)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.completed)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/no-show", response_model=BookingResponse)
async def no_show_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.no_show)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)
