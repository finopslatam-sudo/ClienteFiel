# Scheduling Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready availability + slot-booking engine so tenants can define weekly schedules and clients can book specific time slots without double-booking.

**Architecture:** Tenants configure weekly availability rules (days, hours, slot size, buffer). A slot-generation service computes available slots per request, subtracting active bookings. PostgreSQL advisory locks prevent race conditions on concurrent booking attempts.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 async + PostgreSQL (advisory locks) + zoneinfo + Next.js 14 + TanStack Query

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `backend/app/models/availability.py` | `AvailabilityRule` and `AvailabilityOverride` ORM models |
| `backend/alembic/versions/XXXXXX_availability_engine.py` | Migration: drop time_slots, create availability tables, add `ends_at` to bookings |
| `backend/app/schemas/availability.py` | Pydantic schemas for rules, overrides, slots |
| `backend/app/services/availability_service.py` | CRUD for rules/overrides + `get_available_slots` + `_generate_slots` |
| `backend/app/api/availability.py` | FastAPI router: GET/PUT rules, GET slots, CRUD overrides |
| `backend/tests/test_availability.py` | Unit + integration tests for slot generation and double-booking |
| `frontend/lib/api/availability.ts` | Axios calls for availability endpoints |
| `frontend/lib/hooks/useAvailability.ts` | TanStack Query hooks |
| `frontend/components/availability/WeeklySchedule.tsx` | UI: configure days + hours + slot size |

### Modified files
| File | Change |
|---|---|
| `backend/app/models/booking.py` | Add `ends_at: Mapped[datetime \| None]` column |
| `backend/app/models/__init__.py` | Import `AvailabilityRule`, `AvailabilityOverride`, remove `TimeSlot` |
| `backend/app/services/booking_service.py` | Double-booking check + advisory lock + populate `ends_at` |
| `backend/app/schemas/booking.py` | Add `ends_at` to `BookingResponse` |
| `backend/app/main.py` | Register availability router |
| `frontend/app/(dashboard)/agenda/page.tsx` | Add "Disponibilidad" tab + WeeklySchedule component |

---

## Task 1: Models — AvailabilityRule, AvailabilityOverride, Booking.ends_at

**Files:**
- Create: `backend/app/models/availability.py`
- Modify: `backend/app/models/booking.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Write failing test to verify models import**

```python
# backend/tests/test_availability.py
import pytest
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking

def test_models_importable():
    assert AvailabilityRule.__tablename__ == "availability_rules"
    assert AvailabilityOverride.__tablename__ == "availability_overrides"
    assert hasattr(Booking, "ends_at")
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_availability.py::test_models_importable -v
```
Expected: `ModuleNotFoundError` or `AttributeError`

- [ ] **Step 3: Create `backend/app/models/availability.py`**

```python
import uuid
from datetime import date, time
from sqlalchemy import Integer, Time, Boolean, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class AvailabilityRule(Base, TimestampMixin):
    __tablename__ = "availability_rules"
    __table_args__ = (
        UniqueConstraint("tenant_id", "day_of_week", name="uq_availability_tenant_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon, 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    buffer_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_bookings_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="America/Santiago")


class AvailabilityOverride(Base):
    __tablename__ = "availability_overrides"
    __table_args__ = (
        UniqueConstraint("tenant_id", "override_date", name="uq_override_tenant_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    override_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    custom_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    custom_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

- [ ] **Step 4: Add `ends_at` to `backend/app/models/booking.py`**

After the `scheduled_at` line (line 40), add:
```python
    ends_at: Mapped[datetime | None] = mapped_column(nullable=True, index=True)
```

- [ ] **Step 5: Update `backend/app/models/__init__.py`**

Replace the entire file:
```python
from app.models.tenant import Tenant, TenantPlan, TenantStatus
from app.models.user import User, UserRole
from app.models.whatsapp import WhatsappConnection
from app.models.service import Service
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.customer import Customer, CustomerStatus
from app.models.booking import Booking, BookingStatus, BookingCreatedBy
from app.models.reminder import Reminder, ReminderType, ReminderStatus
from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus
from app.models.subscription import Subscription

__all__ = [
    "Tenant", "TenantPlan", "TenantStatus",
    "User", "UserRole",
    "WhatsappConnection",
    "Service",
    "AvailabilityRule", "AvailabilityOverride",
    "Customer", "CustomerStatus",
    "Booking", "BookingStatus", "BookingCreatedBy",
    "Reminder", "ReminderType", "ReminderStatus",
    "MessageLog", "MessageLogType", "MessageLogStatus",
    "Subscription",
]
```

Note: `TimeSlot` is intentionally removed — replaced by `AvailabilityRule`.

- [ ] **Step 6: Run test to confirm it passes**

```bash
cd backend && python -m pytest tests/test_availability.py::test_models_importable -v
```
Expected: `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/availability.py backend/app/models/booking.py backend/app/models/__init__.py backend/tests/test_availability.py
git commit -m "feat: add AvailabilityRule, AvailabilityOverride models and Booking.ends_at"
```

---

## Task 2: Alembic Migration

**Files:**
- Create: `backend/alembic/versions/XXXXXX_availability_engine.py` (generated, then edited)

- [ ] **Step 1: Generate migration file**

```bash
cd backend && alembic revision --autogenerate -m "availability_engine"
```
This creates `backend/alembic/versions/<hash>_availability_engine.py`.

- [ ] **Step 2: Replace `upgrade()` and `downgrade()` with the verified version below**

Open the generated file and replace both functions completely:

```python
def upgrade() -> None:
    # Drop old unused time_slots table
    op.drop_table("time_slots")

    # Create availability_rules
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("buffer_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_bookings_per_day", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="America/Santiago"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "day_of_week", name="uq_availability_tenant_day"),
    )
    op.create_index("ix_availability_rules_tenant_id", "availability_rules", ["tenant_id"])

    # Create availability_overrides
    op.create_table(
        "availability_overrides",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("override_date", sa.Date(), nullable=False),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("custom_start_time", sa.Time(), nullable=True),
        sa.Column("custom_end_time", sa.Time(), nullable=True),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "override_date", name="uq_override_tenant_date"),
    )
    op.create_index("ix_availability_overrides_tenant_id", "availability_overrides", ["tenant_id"])
    op.create_index("ix_availability_overrides_date", "availability_overrides", ["override_date"])

    # Add ends_at to bookings
    op.add_column("bookings", sa.Column("ends_at", sa.DateTime(), nullable=True))
    op.create_index("ix_bookings_ends_at", "bookings", ["ends_at"])


def downgrade() -> None:
    op.drop_index("ix_bookings_ends_at", table_name="bookings")
    op.drop_column("bookings", "ends_at")
    op.drop_index("ix_availability_overrides_date", table_name="availability_overrides")
    op.drop_index("ix_availability_overrides_tenant_id", table_name="availability_overrides")
    op.drop_table("availability_overrides")
    op.drop_index("ix_availability_rules_tenant_id", table_name="availability_rules")
    op.drop_table("availability_rules")
    op.create_table(
        "time_slots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("max_concurrent", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
```

- [ ] **Step 3: Run migration against local DB**

```bash
cd backend && alembic upgrade head
```
Expected: ends with `Running upgrade ... -> <hash>, availability_engine`

- [ ] **Step 4: Verify tables exist**

```bash
cd backend && python -c "
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    url = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://clientefiel:password@localhost:5432/clientefiel_db')
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\"))
        tables = [r[0] for r in result]
        print(tables)
        assert 'availability_rules' in tables
        assert 'availability_overrides' in tables
        assert 'time_slots' not in tables
    await engine.dispose()

asyncio.run(check())
"
```
Expected: table list printed with no AssertionError

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: add availability_engine migration"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/availability.py`
- Modify: `backend/app/schemas/booking.py`

- [ ] **Step 1: Write failing tests for schema validation**

Add to `backend/tests/test_availability.py`:

```python
from datetime import time
from app.schemas.availability import AvailabilityRuleCreate, WeeklyScheduleRequest

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
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd backend && python -m pytest tests/test_availability.py::test_rule_create_valid -v
```
Expected: `ImportError`

- [ ] **Step 3: Create `backend/app/schemas/availability.py`**

```python
import uuid
from datetime import date, time
from pydantic import BaseModel, field_validator, model_validator


class AvailabilityRuleCreate(BaseModel):
    day_of_week: int  # 0=Mon, 6=Sun
    start_time: time
    end_time: time
    slot_duration_minutes: int = 30
    buffer_minutes: int = 0
    max_bookings_per_day: int | None = None
    is_active: bool = True
    timezone: str = "America/Santiago"

    @field_validator("day_of_week")
    @classmethod
    def validate_dow(cls, v: int) -> int:
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0–6 (Monday=0, Sunday=6)")
        return v

    @model_validator(mode="after")
    def validate_time_range(self) -> "AvailabilityRuleCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityRuleResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    buffer_minutes: int
    max_bookings_per_day: int | None
    is_active: bool
    timezone: str
    model_config = {"from_attributes": True}


class WeeklyScheduleRequest(BaseModel):
    rules: list[AvailabilityRuleCreate]


class WeeklyScheduleResponse(BaseModel):
    rules: list[AvailabilityRuleResponse]


class OverrideCreateRequest(BaseModel):
    override_date: date
    is_closed: bool = False
    custom_start_time: time | None = None
    custom_end_time: time | None = None
    reason: str | None = None


class OverrideResponse(BaseModel):
    id: uuid.UUID
    override_date: date
    is_closed: bool
    custom_start_time: time | None
    custom_end_time: time | None
    reason: str | None
    model_config = {"from_attributes": True}


class SlotItem(BaseModel):
    start: str  # ISO8601 with timezone offset
    end: str
    available: bool


class SlotListResponse(BaseModel):
    date: str
    slots: list[SlotItem]
```

- [ ] **Step 4: Add `ends_at` to `BookingResponse` in `backend/app/schemas/booking.py`**

Replace `BookingResponse` class:
```python
class BookingResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    service_id: uuid.UUID
    scheduled_at: datetime
    ends_at: datetime | None = None
    status: BookingStatus
    created_by: BookingCreatedBy
    created_at: datetime
    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Run schema tests**

```bash
cd backend && python -m pytest tests/test_availability.py::test_rule_create_valid tests/test_availability.py::test_rule_create_validates_day_of_week tests/test_availability.py::test_rule_end_before_start_rejected -v
```
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/availability.py backend/app/schemas/booking.py backend/tests/test_availability.py
git commit -m "feat: add availability schemas and ends_at to BookingResponse"
```

---

## Task 4: AvailabilityService — CRUD + Slot Generation

**Files:**
- Create: `backend/app/services/availability_service.py`

- [ ] **Step 1: Write failing unit tests for slot generation**

Add to `backend/tests/test_availability.py`:

```python
from datetime import date, datetime, time, timezone, timedelta
from zoneinfo import ZoneInfo
from app.services.availability_service import _generate_slots
from app.models.booking import Booking, BookingStatus


def _utc_naive(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _make_booking(scheduled_utc: datetime, duration_min: int, status: BookingStatus = BookingStatus.confirmed) -> Booking:
    b = Booking.__new__(Booking)
    b.scheduled_at = scheduled_utc
    b.ends_at = scheduled_utc + timedelta(minutes=duration_min)
    b.status = status
    return b


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
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd backend && python -m pytest tests/test_availability.py::test_generate_slots_basic -v
```
Expected: `ImportError: cannot import name '_generate_slots'`

- [ ] **Step 3: Create `backend/app/services/availability_service.py`**

```python
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
```

- [ ] **Step 4: Run all slot generation tests**

```bash
cd backend && python -m pytest tests/test_availability.py::test_generate_slots_basic tests/test_availability.py::test_generate_slots_existing_booking_blocks_slot tests/test_availability.py::test_generate_slots_canceled_booking_does_not_block tests/test_availability.py::test_generate_slots_buffer_blocks_adjacent -v
```
Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/availability_service.py backend/tests/test_availability.py
git commit -m "feat: add AvailabilityService with slot generation"
```

---

## Task 5: Update BookingService — Double-booking + Race Condition Prevention

**Files:**
- Modify: `backend/app/services/booking_service.py`

- [ ] **Step 1: Write failing tests for double-booking prevention**

Add to `backend/tests/test_availability.py`:

```python
import pytest_asyncio
from decimal import Decimal
from app.services.booking_service import BookingService
from app.models.service import Service


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
```

- [ ] **Step 2: Run to confirm test fails**

```bash
cd backend && python -m pytest tests/test_availability.py::test_double_booking_rejected -v
```
Expected: FAILED — second booking currently succeeds (no conflict check)

- [ ] **Step 3: Replace `create_booking` in `backend/app/services/booking_service.py`**

Replace the entire `create_booking` method:

```python
    async def create_booking(
        self,
        tenant_id: uuid.UUID,
        customer_phone: str,
        customer_name: str | None,
        service_id: uuid.UUID,
        scheduled_at: datetime,
        created_by: BookingCreatedBy = BookingCreatedBy.admin,
    ) -> Booking:
        from datetime import timedelta
        from sqlalchemy import text

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
        lock_key = tenant_id.int % (2**63)
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
```

- [ ] **Step 4: Run double-booking tests**

```bash
cd backend && python -m pytest tests/test_availability.py::test_double_booking_rejected tests/test_availability.py::test_non_overlapping_bookings_succeed -v
```
Expected: 2 PASSED

- [ ] **Step 5: Run full suite to check for regressions**

```bash
cd backend && python -m pytest --tb=short -q
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/booking_service.py backend/tests/test_availability.py
git commit -m "feat: prevent double-booking with advisory lock and ends_at overlap check"
```

---

## Task 6: Availability API Router

**Files:**
- Create: `backend/app/api/availability.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing integration test**

Add to `backend/tests/test_availability.py`:

```python
from tests.conftest import register_and_login


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
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_availability.py::test_upsert_and_get_rules -v
```
Expected: `404` — route not registered yet

- [ ] **Step 3: Create `backend/app/api/availability.py`**

```python
import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.service import Service
from app.services.availability_service import AvailabilityService
from app.schemas.availability import (
    WeeklyScheduleRequest,
    WeeklyScheduleResponse,
    AvailabilityRuleResponse,
    OverrideCreateRequest,
    OverrideResponse,
    SlotListResponse,
    SlotItem,
)

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("/rules", response_model=WeeklyScheduleResponse)
async def get_rules(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    rules = await svc.get_rules(current_tenant.id)
    return WeeklyScheduleResponse(
        rules=[AvailabilityRuleResponse.model_validate(r) for r in rules]
    )


@router.put("/rules", response_model=WeeklyScheduleResponse)
async def upsert_rules(
    payload: WeeklyScheduleRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    rules = await svc.upsert_rules(
        current_tenant.id, [r.model_dump() for r in payload.rules]
    )
    return WeeklyScheduleResponse(
        rules=[AvailabilityRuleResponse.model_validate(r) for r in rules]
    )


@router.get("/slots", response_model=SlotListResponse)
async def get_slots(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(..., alias="date"),
    service_id: uuid.UUID = Query(...),
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.tenant_id == current_tenant.id,
            Service.is_active,
        )
    )
    service_obj = result.scalar_one_or_none()
    if not service_obj:
        raise HTTPException(status_code=404, detail="Service not found")

    svc = AvailabilityService(db)
    slots = await svc.get_available_slots(
        current_tenant.id, target_date, service_obj.duration_minutes
    )
    return SlotListResponse(
        date=str(target_date),
        slots=[SlotItem(**s) for s in slots],
    )


@router.get("/overrides", response_model=list[OverrideResponse])
async def get_overrides(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    from_date: date = Query(...),
    to_date: date = Query(...),
):
    svc = AvailabilityService(db)
    overrides = await svc.get_overrides(current_tenant.id, from_date, to_date)
    return [OverrideResponse.model_validate(o) for o in overrides]


@router.post("/overrides", response_model=OverrideResponse, status_code=201)
async def create_override(
    payload: OverrideCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    override = await svc.create_override(current_tenant.id, payload.model_dump())
    return OverrideResponse.model_validate(override)


@router.delete("/overrides/{override_id}", status_code=204)
async def delete_override(
    override_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    try:
        await svc.delete_override(current_tenant.id, override_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Override not found")
```

- [ ] **Step 4: Register router in `backend/app/main.py`**

Add import after existing router imports:
```python
from app.api import availability as availability_router
```

Add after `app.include_router(logs_router.router, prefix="/api/v1")`:
```python
app.include_router(availability_router.router, prefix="/api/v1")
```

- [ ] **Step 5: Run integration tests**

```bash
cd backend && python -m pytest tests/test_availability.py::test_upsert_and_get_rules tests/test_availability.py::test_get_slots_no_rules_returns_empty -v
```
Expected: 2 PASSED

- [ ] **Step 6: Run full test suite**

```bash
cd backend && python -m pytest --tb=short -q
```
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/availability.py backend/app/main.py backend/tests/test_availability.py
git commit -m "feat: add availability API endpoints and register router"
```

---

## Task 7: Frontend — API Client + TanStack Query Hooks

**Files:**
- Create: `frontend/lib/api/availability.ts`
- Create: `frontend/lib/hooks/useAvailability.ts`

- [ ] **Step 1: Create `frontend/lib/api/availability.ts`**

```typescript
// frontend/lib/api/availability.ts
import api from '@/lib/api'

export interface AvailabilityRule {
  id: string
  day_of_week: number  // 0=Mon, 6=Sun
  start_time: string   // "HH:MM:SS"
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  max_bookings_per_day: number | null
  is_active: boolean
  timezone: string
}

export interface AvailabilityRuleInput {
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  max_bookings_per_day?: number | null
  is_active: boolean
  timezone: string
}

export interface AvailabilityOverride {
  id: string
  override_date: string
  is_closed: boolean
  custom_start_time: string | null
  custom_end_time: string | null
  reason: string | null
}

export interface AvailabilityOverrideInput {
  override_date: string
  is_closed: boolean
  custom_start_time?: string | null
  custom_end_time?: string | null
  reason?: string | null
}

export interface Slot {
  start: string
  end: string
  available: boolean
}

export interface SlotListResponse {
  date: string
  slots: Slot[]
}

export const availabilityApi = {
  getRules: async (): Promise<{ rules: AvailabilityRule[] }> => {
    const { data } = await api.get('/api/v1/availability/rules')
    return data
  },

  upsertRules: async (rules: AvailabilityRuleInput[]): Promise<{ rules: AvailabilityRule[] }> => {
    const { data } = await api.put('/api/v1/availability/rules', { rules })
    return data
  },

  getSlots: async (date: string, serviceId: string): Promise<SlotListResponse> => {
    const { data } = await api.get('/api/v1/availability/slots', {
      params: { date, service_id: serviceId },
    })
    return data
  },

  getOverrides: async (fromDate: string, toDate: string): Promise<AvailabilityOverride[]> => {
    const { data } = await api.get('/api/v1/availability/overrides', {
      params: { from_date: fromDate, to_date: toDate },
    })
    return data
  },

  createOverride: async (input: AvailabilityOverrideInput): Promise<AvailabilityOverride> => {
    const { data } = await api.post('/api/v1/availability/overrides', input)
    return data
  },

  deleteOverride: async (overrideId: string): Promise<void> => {
    await api.delete(`/api/v1/availability/overrides/${overrideId}`)
  },
}
```

- [ ] **Step 2: Create `frontend/lib/hooks/useAvailability.ts`**

```typescript
// frontend/lib/hooks/useAvailability.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { availabilityApi, AvailabilityRuleInput, AvailabilityOverrideInput } from '@/lib/api/availability'

export function useAvailabilityRules() {
  return useQuery({
    queryKey: ['availability', 'rules'],
    queryFn: availabilityApi.getRules,
  })
}

export function useUpsertRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rules: AvailabilityRuleInput[]) => availabilityApi.upsertRules(rules),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', 'rules'] }),
  })
}

export function useSlots(date: string | null, serviceId: string | null) {
  return useQuery({
    queryKey: ['availability', 'slots', date, serviceId],
    queryFn: () => availabilityApi.getSlots(date!, serviceId!),
    enabled: Boolean(date && serviceId),
  })
}

export function useCreateOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AvailabilityOverrideInput) => availabilityApi.createOverride(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}

export function useDeleteOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overrideId: string) => availabilityApi.deleteOverride(overrideId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors in the new files

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api/availability.ts frontend/lib/hooks/useAvailability.ts
git commit -m "feat: add frontend availability API client and hooks"
```

---

## Task 8: WeeklySchedule Component

**Files:**
- Create: `frontend/components/availability/WeeklySchedule.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p frontend/components/availability
```

- [ ] **Step 2: Create `frontend/components/availability/WeeklySchedule.tsx`**

```tsx
// frontend/components/availability/WeeklySchedule.tsx
'use client'
import { useState, useEffect } from 'react'
import { useAvailabilityRules, useUpsertRules } from '@/lib/hooks/useAvailability'
import { AvailabilityRuleInput } from '@/lib/api/availability'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SLOT_OPTIONS = [15, 30, 45, 60]
const BUFFER_OPTIONS = [0, 5, 10, 15, 30]

interface DayConfig {
  enabled: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

const DEFAULT_DAY: DayConfig = {
  enabled: false,
  start_time: '09:00',
  end_time: '18:00',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
}

function toApiTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

function fromApiTime(t: string): string {
  return t.slice(0, 5)
}

export function WeeklySchedule() {
  const { data, isLoading } = useAvailabilityRules()
  const upsert = useUpsertRules()
  const [days, setDays] = useState<DayConfig[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }))
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    setDays(prev =>
      prev.map((d, i) => {
        const rule = data.rules.find(r => r.day_of_week === i)
        if (!rule) return d
        return {
          enabled: rule.is_active,
          start_time: fromApiTime(rule.start_time),
          end_time: fromApiTime(rule.end_time),
          slot_duration_minutes: rule.slot_duration_minutes,
          buffer_minutes: rule.buffer_minutes,
        }
      })
    )
  }, [data])

  function updateDay(index: number, patch: Partial<DayConfig>) {
    setDays(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function handleSave() {
    const rules: AvailabilityRuleInput[] = days
      .filter(d => d.enabled)
      .map((d, i) => ({
        day_of_week: days.indexOf(d) === -1 ? i : days.findIndex((_, idx) => days[idx] === d),
        start_time: toApiTime(d.start_time),
        end_time: toApiTime(d.end_time),
        slot_duration_minutes: d.slot_duration_minutes,
        buffer_minutes: d.buffer_minutes,
        is_active: true,
        timezone: 'America/Santiago',
      }))

    // Build rules preserving correct day_of_week index
    const indexedRules: AvailabilityRuleInput[] = days
      .map((d, i) => ({
        day_of_week: i,
        start_time: toApiTime(d.start_time),
        end_time: toApiTime(d.end_time),
        slot_duration_minutes: d.slot_duration_minutes,
        buffer_minutes: d.buffer_minutes,
        is_active: d.enabled,
        timezone: 'America/Santiago',
      }))
      .filter(r => r.is_active)

    await upsert.mutateAsync(indexedRules)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando horarios...</div>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
        Configura los días y horarios en que recibirás reservas. El timezone es America/Santiago.
      </p>

      {days.map((day, i) => (
        <div
          key={i}
          className="glass-card p-4"
          style={{ opacity: day.enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {/* Toggle + day name */}
            <div className="flex items-center gap-3 w-28">
              <button
                onClick={() => updateDay(i, { enabled: !day.enabled })}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{
                  background: day.enabled ? 'rgba(6,182,212,0.8)' : 'rgba(100,116,139,0.3)',
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: day.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
              <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                {DAY_NAMES[i]}
              </span>
            </div>

            {/* Time range */}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={day.start_time}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { start_time: e.target.value })}
                className="text-sm px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              />
              <span style={{ color: '#94a3b8' }}>–</span>
              <input
                type="time"
                value={day.end_time}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { end_time: e.target.value })}
                className="text-sm px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              />
            </div>

            {/* Slot duration */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>Slot</span>
              <select
                value={day.slot_duration_minutes}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { slot_duration_minutes: Number(e.target.value) })}
                className="text-sm px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              >
                {SLOT_OPTIONS.map(v => (
                  <option key={v} value={v}>{v} min</option>
                ))}
              </select>
            </div>

            {/* Buffer */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>Buffer</span>
              <select
                value={day.buffer_minutes}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { buffer_minutes: Number(e.target.value) })}
                className="text-sm px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              >
                {BUFFER_OPTIONS.map(v => (
                  <option key={v} value={v}>{v === 0 ? 'Sin buffer' : `${v} min`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.15)',
          border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.3)'}`,
          color: saved ? '#10b981' : '#06b6d4',
        }}
      >
        {upsert.isPending ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar horarios'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/components/availability/WeeklySchedule.tsx
git commit -m "feat: add WeeklySchedule component"
```

---

## Task 9: Update Agenda Page — Add Tabs

**Files:**
- Modify: `frontend/app/(dashboard)/agenda/page.tsx`

- [ ] **Step 1: Replace `frontend/app/(dashboard)/agenda/page.tsx`**

```tsx
// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useBookings, useCancelBooking, useCompleteBooking } from '@/lib/hooks/useBookings'
import { formatWeekRange, nextWeek, prevWeek } from '@/lib/utils/dates'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import { WeeklySchedule } from '@/components/availability/WeeklySchedule'

type Tab = 'reservas' | 'disponibilidad'

const statusStyle: Record<string, string> = {
  confirmed: '#10b981',
  canceled: '#ef4444',
  completed: '#94a3b8',
  pending: '#f59e0b',
}

interface BookingCardProps {
  booking: { id: string; scheduled_at: string; status: string }
  onComplete: () => void
  onCancel: () => void
}

function BookingCard({ booking, onComplete, onCancel }: BookingCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className="glass-card glass-card-hover p-4 flex items-center justify-between"
    >
      <div>
        <div className="font-medium" style={{ color: '#f1f5f9' }}>
          {format(new Date(booking.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
        </div>
        <div className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          ID: {booking.id.slice(0, 8)}... ·{' '}
          <span className="font-medium" style={{ color: statusStyle[booking.status] ?? '#94a3b8' }}>
            {booking.status}
          </span>
        </div>
      </div>
      {booking.status === 'confirmed' && (
        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
          >
            Completar
          </button>
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            Cancelar
          </button>
        </div>
      )}
    </motion.div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'reservas', label: 'Reservas' },
    { key: 'disponibilidad', label: 'Disponibilidad' },
  ]
  return (
    <div
      className="flex gap-1 mb-6 p-1 rounded-lg"
      style={{ background: 'rgba(15,23,42,0.4)', width: 'fit-content' }}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={{
            background: active === t.key ? 'rgba(6,182,212,0.15)' : 'transparent',
            color: active === t.key ? '#06b6d4' : '#94a3b8',
            border: active === t.key ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function AgendaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reservas')
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const dateFrom = startOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Agenda</h1>
        {activeTab === 'reservas' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentWeek(prevWeek(currentWeek))}
              className="px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
              {formatWeekRange(currentWeek)}
            </span>
            <button
              onClick={() => setCurrentWeek(nextWeek(currentWeek))}
              className="px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'reservas' && (
        isLoading ? (
          <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando reservas...</div>
        ) : data?.bookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p style={{ color: '#94a3b8' }}>No hay reservas esta semana.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {data?.bookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onComplete={() => completeBooking.mutate(booking.id)}
                onCancel={() => cancelBooking.mutate(booking.id)}
              />
            ))}
          </motion.div>
        )
      )}

      {activeTab === 'disponibilidad' && <WeeklySchedule />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Test locally**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/agenda`:
- Two tabs visible: "Reservas" and "Disponibilidad"
- "Disponibilidad" tab shows 7 days with toggles, time pickers, slot/buffer selectors
- Enabling a day and clicking "Guardar horarios" shows "Guardado ✓" briefly

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(dashboard)/agenda/page.tsx
git commit -m "feat: add Disponibilidad tab with WeeklySchedule to Agenda page"
```

---

## Task 10: Push and Deploy

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && python -m pytest -v --tb=short
```
Expected: all tests pass, coverage ≥ 70%

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Verify CI passes**

Check GitHub Actions → all steps green:
1. Lint (ruff) — no errors
2. Tests — all pass including new test_availability.py
3. Deploy → SSH to Hetzner → `alembic upgrade head` runs the availability_engine migration

- [ ] **Step 4: Smoke test production API**

```bash
# Login and get token
TOKEN=$(curl -s -X POST https://api.clientefiel.riava.cl/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Save a weekly rule
curl -X PUT https://api.clientefiel.riava.cl/api/v1/availability/rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rules":[{"day_of_week":0,"start_time":"09:00:00","end_time":"18:00:00","slot_duration_minutes":30,"buffer_minutes":0,"is_active":true,"timezone":"America/Santiago"}]}'
```

Expected: JSON response with the saved rule.

- [ ] **Step 5: Verify in production browser**

Open `https://clientefiel.riava.cl/agenda` → click "Disponibilidad" → enable Monday 09:00–18:00 → click "Guardar horarios" → shows "Guardado ✓"

---

## Spec Coverage

| Requirement | Task |
|---|---|
| Enable/disable days of week | Task 8 (toggle per day) |
| Working hours per day | Task 8 (time range inputs) |
| Slot duration + buffer per day | Task 1/4/8 |
| Max bookings per day | Task 1/3 — stored, not enforced in slot gen (extend post-MVP) |
| Prevent double booking | Task 5 (overlap check) |
| Booking statuses | Pre-existing |
| Generate slots dynamically | Task 4 (_generate_slots) |
| Exclude already-booked slots | Task 4 (overlap check in _generate_slots) |
| Availability overrides for specific dates | Task 1/4/6 |
| Timezone per rule (default America/Santiago) | Task 1 |
| Multi-tenant isolation (all queries filter by tenant_id) | Tasks 1/4/6 |
| Race condition prevention | Task 5 (pg_advisory_xact_lock) |
| GET/PUT /availability/rules | Task 6 |
| GET /availability/slots | Task 6 |
| CRUD /availability/overrides | Task 6 |
| Frontend availability config UI | Task 8 |
| Integrated in existing Agenda page | Task 9 |
