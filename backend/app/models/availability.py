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
