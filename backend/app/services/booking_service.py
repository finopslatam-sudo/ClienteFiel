import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.booking import Booking, BookingStatus, BookingCreatedBy
from app.models.customer import Customer, CustomerStatus
from app.models.service import Service


class BookingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_create_customer(
        self, tenant_id: uuid.UUID, phone_number: str, name: str | None
    ) -> Customer:
        result = await self.db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.phone_number == phone_number,
            )
        )
        customer = result.scalar_one_or_none()
        if not customer:
            customer = Customer(
                tenant_id=tenant_id,
                phone_number=phone_number,
                name=name,
                status=CustomerStatus.active,
            )
            self.db.add(customer)
            await self.db.flush()
        elif name and not customer.name:
            customer.name = name
        return customer

    async def create_booking(
        self,
        tenant_id: uuid.UUID,
        customer_phone: str,
        customer_name: str | None,
        service_id: uuid.UUID,
        scheduled_at: datetime,
        created_by: BookingCreatedBy = BookingCreatedBy.admin,
    ) -> Booking:
        if scheduled_at.tzinfo is not None:
            scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)

        result = await self.db.execute(
            select(Service).where(
                Service.id == service_id,
                Service.tenant_id == tenant_id,
                Service.is_active,
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise ValueError("Service not found or inactive")

        ends_at = scheduled_at + timedelta(minutes=service.duration_minutes)

        # Advisory lock scoped to this tenant prevents concurrent double-booking
        lock_key = abs(tenant_id.int) % (2**63)
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(:key)").bindparams(key=lock_key)
        )

        conflict_result = await self.db.execute(
            select(Booking).where(
                Booking.tenant_id == tenant_id,
                Booking.scheduled_at < ends_at,
                Booking.ends_at > scheduled_at,
                Booking.status.not_in([BookingStatus.canceled, BookingStatus.no_show]),
            )
        )
        if conflict_result.scalar_one_or_none():
            raise ValueError("Time slot already booked")

        customer = await self._get_or_create_customer(tenant_id, customer_phone, customer_name)

        booking = Booking(
            tenant_id=tenant_id,
            customer_id=customer.id,
            service_id=service_id,
            scheduled_at=scheduled_at,
            ends_at=ends_at,
            status=BookingStatus.confirmed,
            created_by=created_by,
        )
        self.db.add(booking)
        customer.total_bookings += 1
        customer.last_booking_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def get_booking(self, tenant_id: uuid.UUID, booking_id: uuid.UUID) -> Booking | None:
        result = await self.db.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_bookings(
        self,
        tenant_id: uuid.UUID,
        status: BookingStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Booking]:
        query = select(Booking).where(Booking.tenant_id == tenant_id)
        if status:
            query = query.where(Booking.status == status)
        if date_from:
            query = query.where(Booking.scheduled_at >= date_from)
        if date_to:
            query = query.where(Booking.scheduled_at <= date_to)
        result = await self.db.execute(query.order_by(Booking.scheduled_at))
        return list(result.scalars().all())

    async def update_status(
        self, tenant_id: uuid.UUID, booking_id: uuid.UUID, new_status: BookingStatus
    ) -> Booking:
        booking = await self.get_booking(tenant_id, booking_id)
        if not booking:
            raise ValueError("Booking not found")
        booking.status = new_status
        await self.db.commit()
        await self.db.refresh(booking)
        return booking
