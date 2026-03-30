import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ReminderType(str, enum.Enum):
    confirmation = "confirmation"
    reminder_24h = "reminder_24h"
    reminder_1h = "reminder_1h"
    repurchase = "repurchase"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[ReminderType] = mapped_column(SAEnum(ReminderType), nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[ReminderStatus] = mapped_column(
        SAEnum(ReminderStatus), default=ReminderStatus.pending, nullable=False
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
