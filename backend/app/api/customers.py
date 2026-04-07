# backend/app/api/customers.py
import uuid
from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.customer import Customer, CustomerStatus
from app.models.booking import Booking, BookingStatus

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerDetail(BaseModel):
    id: uuid.UUID
    name: str | None
    phone_number: str
    status: str
    total_bookings: int
    points_balance: int
    last_booking_at: datetime | None
    created_at: datetime
    upcoming_bookings: int
    completed_bookings: int
    canceled_bookings: int


class CustomerListResponse(BaseModel):
    customers: list[CustomerDetail]
    total: int


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None),
    status: CustomerStatus | None = Query(default=None),
    order_by: str = Query(default="last_booking_at", pattern="^(last_booking_at|total_bookings|created_at|name)$"),
    order_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    base = select(Customer).where(Customer.tenant_id == current_tenant.id)
    if search:
        term = f"%{search.lower()}%"
        base = base.where(
            (func.lower(Customer.name).like(term)) |
            (Customer.phone_number.like(term))
        )
    if status:
        base = base.where(Customer.status == status)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar() or 0

    order_col = {
        "last_booking_at": Customer.last_booking_at,
        "total_bookings": Customer.total_bookings,
        "created_at": Customer.created_at,
        "name": Customer.name,
    }[order_by]
    base = base.order_by(order_col.desc() if order_dir == "desc" else order_col.asc())
    base = base.limit(limit).offset(offset)

    result = await db.execute(base)
    customers = result.scalars().all()

    now = datetime.utcnow()

    # Batch stats per customer
    customer_ids = [c.id for c in customers]
    details: list[CustomerDetail] = []

    if customer_ids:
        upcoming_res = await db.execute(
            select(Booking.customer_id, func.count(Booking.id))
            .where(
                Booking.tenant_id == current_tenant.id,
                Booking.customer_id.in_(customer_ids),
                Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
                Booking.scheduled_at >= now,
            )
            .group_by(Booking.customer_id)
        )
        upcoming_map = dict(upcoming_res.all())

        completed_res = await db.execute(
            select(Booking.customer_id, func.count(Booking.id))
            .where(
                Booking.tenant_id == current_tenant.id,
                Booking.customer_id.in_(customer_ids),
                Booking.status == BookingStatus.completed,
            )
            .group_by(Booking.customer_id)
        )
        completed_map = dict(completed_res.all())

        canceled_res = await db.execute(
            select(Booking.customer_id, func.count(Booking.id))
            .where(
                Booking.tenant_id == current_tenant.id,
                Booking.customer_id.in_(customer_ids),
                Booking.status.in_([BookingStatus.canceled, BookingStatus.no_show]),
            )
            .group_by(Booking.customer_id)
        )
        canceled_map = dict(canceled_res.all())

        for c in customers:
            details.append(CustomerDetail(
                id=c.id,
                name=c.name,
                phone_number=c.phone_number,
                status=c.status.value,
                total_bookings=c.total_bookings,
                points_balance=c.points_balance,
                last_booking_at=c.last_booking_at,
                created_at=c.created_at,
                upcoming_bookings=upcoming_map.get(c.id, 0),
                completed_bookings=completed_map.get(c.id, 0),
                canceled_bookings=canceled_map.get(c.id, 0),
            ))

    return CustomerListResponse(customers=details, total=total)
