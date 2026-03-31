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

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get dashboard summary: bookings today and pending bookings."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start = today_start.replace(tzinfo=None)
    today_end = today_start + timedelta(days=1)

    result_today = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.scheduled_at >= today_start,
            Booking.scheduled_at < today_end,
        )
    )
    bookings_today = result_today.scalar() or 0

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    result_pending = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.scheduled_at >= now_naive,
        )
    )
    bookings_pending = result_pending.scalar() or 0

    return {
        "bookings_today": bookings_today,
        "bookings_pending": bookings_pending,
    }


@router.get("/agenda")
async def get_agenda(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    week: datetime | None = Query(default=None),
):
    """Get weekly agenda of bookings starting from a given week."""
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
