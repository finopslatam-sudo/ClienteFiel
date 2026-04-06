import pytest
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking


def test_models_importable():
    assert AvailabilityRule.__tablename__ == "availability_rules"
    assert AvailabilityOverride.__tablename__ == "availability_overrides"
    assert hasattr(Booking, "ends_at")


from datetime import time
from app.schemas.availability import AvailabilityRuleCreate


def test_rule_create_validates_day_of_week():
    with pytest.raises(Exception):
        AvailabilityRuleCreate(
            day_of_week=7,
            start_time=time(9, 0),
            end_time=time(18, 0),
        )


def test_rule_create_valid():
    rule = AvailabilityRuleCreate(
        day_of_week=0,
        start_time=time(9, 0),
        end_time=time(18, 0),
    )
    assert rule.slot_duration_minutes == 30
    assert rule.timezone == "America/Santiago"


def test_rule_end_before_start_rejected():
    with pytest.raises(Exception):
        AvailabilityRuleCreate(
            day_of_week=0,
            start_time=time(18, 0),
            end_time=time(9, 0),
        )


import types
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from app.services.availability_service import _generate_slots
from app.models.booking import BookingStatus


def _utc_naive(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _make_booking(scheduled_utc: datetime, duration_min: int, status: BookingStatus = BookingStatus.confirmed) -> types.SimpleNamespace:
    """Return a lightweight duck-typed booking without a DB session."""
    return types.SimpleNamespace(
        scheduled_at=scheduled_utc,
        ends_at=scheduled_utc + timedelta(minutes=duration_min),
        status=status,
    )


def test_generate_slots_basic():
    """09:00–11:00 with 60-min slots → 2 slots, both available."""
    tz = ZoneInfo("America/Santiago")
    day_start = datetime(2026, 4, 6, 9, 0, tzinfo=tz)
    day_end = datetime(2026, 4, 6, 11, 0, tzinfo=tz)
    slots = _generate_slots(
        day_start=day_start, day_end=day_end,
        slot_duration_minutes=60, buffer_minutes=0,
        service_duration_minutes=60, existing_bookings=[],
    )
    assert len(slots) == 2
    assert all(s["available"] for s in slots)


def test_generate_slots_existing_booking_blocks_slot():
    """Booking at 09:00 UTC for 60 min blocks the 09:00 slot."""
    tz = ZoneInfo("America/Santiago")
    day_start = datetime(2026, 4, 6, 9, 0, tzinfo=tz)
    day_end = datetime(2026, 4, 6, 11, 0, tzinfo=tz)
    booking = _make_booking(_utc_naive(day_start), 60)
    slots = _generate_slots(
        day_start=day_start, day_end=day_end,
        slot_duration_minutes=60, buffer_minutes=0,
        service_duration_minutes=60, existing_bookings=[booking],
    )
    assert slots[0]["available"] is False
    assert slots[1]["available"] is True


def test_generate_slots_canceled_booking_does_not_block():
    """Canceled booking leaves slot available."""
    tz = ZoneInfo("America/Santiago")
    day_start = datetime(2026, 4, 6, 9, 0, tzinfo=tz)
    day_end = datetime(2026, 4, 6, 11, 0, tzinfo=tz)
    booking = _make_booking(_utc_naive(day_start), 60, BookingStatus.canceled)
    slots = _generate_slots(
        day_start=day_start, day_end=day_end,
        slot_duration_minutes=60, buffer_minutes=0,
        service_duration_minutes=60, existing_bookings=[booking],
    )
    assert all(s["available"] for s in slots)


def test_generate_slots_buffer_blocks_adjacent():
    """30-min service + 15-min buffer: booking at 09:00 blocks 09:00 and 09:30 slots."""
    tz = ZoneInfo("America/Santiago")
    day_start = datetime(2026, 4, 6, 9, 0, tzinfo=tz)
    day_end = datetime(2026, 4, 6, 11, 0, tzinfo=tz)
    # ends_at includes buffer: 09:00 + 30 + 15 = 09:45
    booking = _make_booking(_utc_naive(day_start), 45)
    slots = _generate_slots(
        day_start=day_start, day_end=day_end,
        slot_duration_minutes=30, buffer_minutes=15,
        service_duration_minutes=30, existing_bookings=[booking],
    )
    assert slots[0]["available"] is False  # 09:00
    assert slots[1]["available"] is False  # 09:30 — within buffer ends_at=09:45
    assert slots[2]["available"] is True   # 10:00
    assert slots[3]["available"] is True   # 10:30
