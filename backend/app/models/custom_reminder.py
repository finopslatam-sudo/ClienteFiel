import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Integer, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.custom_reminder_customer import CustomReminderCustomer


class CustomReminder(Base, TimestampMixin):
    __tablename__ = "custom_reminders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"),
        nullable=True
    )
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    days_before: Mapped[int] = mapped_column(Integer, nullable=False)
    time_unit: Mapped[str] = mapped_column(Text, nullable=False, default="days")
    send_time: Mapped[str] = mapped_column(Text, nullable=False, default="09:00")
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    reminder_customers: Mapped[list["CustomReminderCustomer"]] = relationship(
        "CustomReminderCustomer", lazy="selectin", cascade="all, delete-orphan"
    )
