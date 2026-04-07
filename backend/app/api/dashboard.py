# backend/app/api/dashboard.py
from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.booking import Booking, BookingStatus
from app.models.customer import Customer
from app.models.service import Service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _today_range():
    today_start = _now_naive().replace(hour=0, minute=0, second=0, microsecond=0)
    return today_start, today_start + timedelta(days=1)


@router.get("/summary")
async def get_summary(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    today_start, today_end = _today_range()
    now = _now_naive()

    result_today = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.scheduled_at >= today_start,
            Booking.scheduled_at < today_end,
            Booking.status.not_in([BookingStatus.canceled, BookingStatus.no_show]),
        )
    )
    bookings_today = result_today.scalar() or 0

    result_pending = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.scheduled_at >= now,
        )
    )
    bookings_pending = result_pending.scalar() or 0

    result_total_customers = await db.execute(
        select(func.count(Customer.id)).where(Customer.tenant_id == current_tenant.id)
    )
    total_customers = result_total_customers.scalar() or 0

    # Customers with at least one upcoming confirmed/pending booking
    upcoming_booking_subq = (
        select(Booking.customer_id)
        .where(
            Booking.tenant_id == current_tenant.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.scheduled_at >= now,
        )
        .scalar_subquery()
    )
    result_with_upcoming = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.tenant_id == current_tenant.id,
            Customer.id.in_(upcoming_booking_subq),
        )
    )
    customers_with_upcoming = result_with_upcoming.scalar() or 0
    customers_without_upcoming = total_customers - customers_with_upcoming

    result_services = await db.execute(
        select(func.count(Service.id)).where(
            Service.tenant_id == current_tenant.id,
            Service.is_active,
        )
    )
    active_services = result_services.scalar() or 0

    return {
        "bookings_today": bookings_today,
        "bookings_pending": bookings_pending,
        "total_customers": total_customers,
        "customers_without_upcoming": customers_without_upcoming,
        "active_services": active_services,
    }


@router.get("/upcoming")
async def get_upcoming(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
):
    now = _now_naive()

    result = await db.execute(
        select(Booking, Customer, Service)
        .join(Customer, Booking.customer_id == Customer.id)
        .join(Service, Booking.service_id == Service.id)
        .where(
            Booking.tenant_id == current_tenant.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.scheduled_at >= now,
        )
        .order_by(Booking.scheduled_at)
        .limit(limit)
    )
    rows = result.all()

    return {
        "bookings": [
            {
                "id": str(b.id),
                "scheduled_at": b.scheduled_at.isoformat(),
                "ends_at": b.ends_at.isoformat() if b.ends_at else None,
                "status": b.status.value,
                "service_name": s.name,
                "customer_name": c.name,
                "customer_phone": c.phone_number,
            }
            for b, c, s in rows
        ]
    }


@router.get("/agenda")
async def get_agenda(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    week: datetime | None = Query(default=None),
):
    if not week:
        week = datetime.now(timezone.utc)

    week_start = week.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(Booking).where(
            Booking.tenant_id == current_tenant.id,
            Booking.scheduled_at >= week_start,
            Booking.scheduled_at < week_end,
        ).order_by(Booking.scheduled_at)
    )
    bookings = result.scalars().all()

    return {
        "bookings": [
            {
                "id": str(b.id),
                "scheduled_at": b.scheduled_at.isoformat(),
                "status": b.status.value,
            }
            for b in bookings
        ]
    }
