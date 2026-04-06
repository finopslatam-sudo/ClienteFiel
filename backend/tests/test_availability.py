import types
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import datetime, time, timezone, timedelta
from zoneinfo import ZoneInfo

from tests.conftest import register_and_login
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking, BookingStatus
from app.schemas.availability import AvailabilityRuleCreate
from app.services.availability_service import _generate_slots
from app.services.booking_service import BookingService
from app.models.service import Service


# ---------------------------------------------------------------------------
# Task 1: Models importable
# ---------------------------------------------------------------------------

def test_models_importable():
    assert AvailabilityRule.__tablename__ == "availability_rules"
    assert AvailabilityOverride.__tablename__ == "availability_overrides"
    assert hasattr(Booking, "ends_at")


# ---------------------------------------------------------------------------
# Task 3: Schema validation
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Task 4: Slot generation
# ---------------------------------------------------------------------------

def _utc_naive(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _make_booking(
    scheduled_utc: datetime,
    duration_min: int,
    status: BookingStatus = BookingStatus.confirmed,
) -> types.SimpleNamespace:
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


# ---------------------------------------------------------------------------
# Task 5: Double-booking prevention
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def service_obj(db_session, tenant):
    svc = Service(
        tenant_id=tenant.id,
        name="Corte",
        duration_minutes=30,
        price=Decimal("15000"),
        is_active=True,
    )
    db_session.add(svc)
    await db_session.commit()
    await db_session.refresh(svc)
    return svc


@pytest.mark.asyncio
async def test_double_booking_rejected(db_session, tenant, service_obj):
    svc = BookingService(db_session)
    scheduled = datetime(2026, 5, 10, 10, 0, 0)

    await svc.create_booking(
        tenant_id=tenant.id,
        customer_phone="+56912345678",
        customer_name="Ana",
        service_id=service_obj.id,
        scheduled_at=scheduled,
    )

    with pytest.raises(ValueError, match="already booked"):
        await svc.create_booking(
            tenant_id=tenant.id,
            customer_phone="+56987654321",
            customer_name="Luis",
            service_id=service_obj.id,
            scheduled_at=scheduled,
        )


@pytest.mark.asyncio
async def test_non_overlapping_bookings_succeed(db_session, tenant, service_obj):
    svc = BookingService(db_session)
    b1 = await svc.create_booking(
        tenant_id=tenant.id,
        customer_phone="+56911111111",
        customer_name="Ana",
        service_id=service_obj.id,
        scheduled_at=datetime(2026, 5, 10, 10, 0, 0),
    )
    b2 = await svc.create_booking(
        tenant_id=tenant.id,
        customer_phone="+56922222222",
        customer_name="Luis",
        service_id=service_obj.id,
        scheduled_at=datetime(2026, 5, 10, 10, 30, 0),
    )
    assert b1.id != b2.id
    assert b1.ends_at is not None


# ---------------------------------------------------------------------------
# Task 6: Integration via HTTP client
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upsert_and_get_rules(client):
    token = await register_and_login(client, "avail@test.com", "AvailBiz")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "rules": [{
            "day_of_week": 0,
            "start_time": "09:00:00",
            "end_time": "18:00:00",
            "slot_duration_minutes": 30,
            "buffer_minutes": 0,
            "is_active": True,
            "timezone": "America/Santiago",
        }]
    }
    resp = await client.put("/api/v1/availability/rules", json=payload, headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["rules"]) == 1
    assert resp.json()["rules"][0]["day_of_week"] == 0

    resp2 = await client.get("/api/v1/availability/rules", headers=headers)
    assert resp2.status_code == 200
    assert len(resp2.json()["rules"]) == 1


@pytest.mark.asyncio
async def test_get_slots_no_rules_returns_empty(client):
    token = await register_and_login(client, "slots@test.com", "SlotBiz")
    headers = {"Authorization": f"Bearer {token}"}

    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Corte", "duration_minutes": 30, "price": "15000"},
        headers=headers,
    )
    assert svc_resp.status_code == 201
    service_id = svc_resp.json()["id"]

    resp = await client.get(
        "/api/v1/availability/slots",
        params={"date": "2026-05-11", "service_id": service_id},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["slots"] == []
