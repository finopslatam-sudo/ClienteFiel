import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking, BookingStatus


class AvailabilityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_rules(self, tenant_id: uuid.UUID) -> list[AvailabilityRule]:
        result = await self.db.execute(
            select(AvailabilityRule)
            .where(AvailabilityRule.tenant_id == tenant_id)
            .order_by(AvailabilityRule.day_of_week)
        )
        return list(result.scalars().all())

    async def upsert_rules(
        self, tenant_id: uuid.UUID, rules_data: list[dict]
    ) -> list[AvailabilityRule]:
        await self.db.execute(
            delete(AvailabilityRule).where(AvailabilityRule.tenant_id == tenant_id)
        )
        new_rules = [AvailabilityRule(tenant_id=tenant_id, **data) for data in rules_data]
        for rule in new_rules:
            self.db.add(rule)
        await self.db.commit()
        for rule in new_rules:
            await self.db.refresh(rule)
        return new_rules

    async def get_overrides(
        self, tenant_id: uuid.UUID, from_date: date, to_date: date
    ) -> list[AvailabilityOverride]:
        result = await self.db.execute(
            select(AvailabilityOverride).where(
                AvailabilityOverride.tenant_id == tenant_id,
                AvailabilityOverride.override_date >= from_date,
                AvailabilityOverride.override_date <= to_date,
            ).order_by(AvailabilityOverride.override_date)
        )
        return list(result.scalars().all())

    async def create_override(
        self, tenant_id: uuid.UUID, data: dict
    ) -> AvailabilityOverride:
        override = AvailabilityOverride(tenant_id=tenant_id, **data)
        self.db.add(override)
        await self.db.commit()
        await self.db.refresh(override)
        return override

    async def delete_override(
        self, tenant_id: uuid.UUID, override_id: uuid.UUID
    ) -> None:
        result = await self.db.execute(
            select(AvailabilityOverride).where(
                AvailabilityOverride.id == override_id,
                AvailabilityOverride.tenant_id == tenant_id,
            )
        )
        override = result.scalar_one_or_none()
        if not override:
            raise ValueError("Override not found")
        await self.db.delete(override)
        await self.db.commit()

    async def get_available_slots(
        self,
        tenant_id: uuid.UUID,
        target_date: date,
        service_duration_minutes: int,
    ) -> list[dict]:
        dow = target_date.weekday()  # 0=Mon, 6=Sun

        rule_result = await self.db.execute(
            select(AvailabilityRule).where(
                AvailabilityRule.tenant_id == tenant_id,
                AvailabilityRule.day_of_week == dow,
                AvailabilityRule.is_active,
            )
        )
        rule = rule_result.scalar_one_or_none()
        if not rule:
            return []

        override_result = await self.db.execute(
            select(AvailabilityOverride).where(
                AvailabilityOverride.tenant_id == tenant_id,
                AvailabilityOverride.override_date == target_date,
            )
        )
        override = override_result.scalar_one_or_none()

        if override and override.is_closed:
            return []

        start_t = (override.custom_start_time if override and override.custom_start_time
                   else rule.start_time)
        end_t = (override.custom_end_time if override and override.custom_end_time
                 else rule.end_time)

        tz = ZoneInfo(rule.timezone)
        day_start = datetime.combine(target_date, start_t).replace(tzinfo=tz)
        day_end = datetime.combine(target_date, end_t).replace(tzinfo=tz)

        window_start_utc = day_start.astimezone(timezone.utc).replace(tzinfo=None)
        window_end_utc = day_end.astimezone(timezone.utc).replace(tzinfo=None)

        bookings_result = await self.db.execute(
            select(Booking).where(
                Booking.tenant_id == tenant_id,
                Booking.scheduled_at < window_end_utc,
                Booking.ends_at > window_start_utc,
                Booking.status.not_in([BookingStatus.canceled, BookingStatus.no_show]),
            )
        )
        existing = list(bookings_result.scalars().all())

        return _generate_slots(
            day_start=day_start,
            day_end=day_end,
            slot_duration_minutes=rule.slot_duration_minutes,
            buffer_minutes=rule.buffer_minutes,
            service_duration_minutes=service_duration_minutes,
            existing_bookings=existing,
        )


def _generate_slots(
    day_start: datetime,
    day_end: datetime,
    slot_duration_minutes: int,
    buffer_minutes: int,
    service_duration_minutes: int,
    existing_bookings: list[Booking],
) -> list[dict]:
    """
    Generate candidate slots between day_start and day_end.

    Slots are offered every `slot_duration_minutes`.
    Each slot covers `service_duration_minutes` of service.
    A slot is blocked if any active booking's [scheduled_at, ends_at] overlaps
    [slot_start_utc, slot_start_utc + service_duration].
    The ends_at of a booking includes buffer_minutes, stored by BookingService.
    """
    service_dur = timedelta(minutes=service_duration_minutes)
    step = timedelta(minutes=slot_duration_minutes)
    slots = []
    current = day_start

    while current + service_dur <= day_end:
        slot_end = current + service_dur
        slot_start_utc = current.astimezone(timezone.utc).replace(tzinfo=None)
        slot_end_utc = slot_end.astimezone(timezone.utc).replace(tzinfo=None)

        is_taken = any(
            b.scheduled_at < slot_end_utc
            and (b.ends_at or b.scheduled_at + service_dur) > slot_start_utc
            for b in existing_bookings
            if b.status not in (BookingStatus.canceled, BookingStatus.no_show)
        )

        slots.append({
            "start": current.isoformat(),
            "end": slot_end.isoformat(),
            "available": not is_taken,
        })
        current += step

    return slots
