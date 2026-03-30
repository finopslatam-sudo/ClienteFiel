import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class MessageLogType(str, enum.Enum):
    confirmation = "confirmation"
    reminder_24h = "reminder_24h"
    reminder_1h = "reminder_1h"
    campaign = "campaign"
    system = "system"


class MessageLogStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class MessageLog(Base):
    """
    Trazabilidad de envíos. NO guarda contenido del mensaje ni payload de Meta.
    Solo registra el evento: quién, cuándo, tipo, resultado.
    """
    __tablename__ = "message_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True
    )
    type: Mapped[MessageLogType] = mapped_column(SAEnum(MessageLogType), nullable=False)
    status: Mapped[MessageLogStatus] = mapped_column(
        SAEnum(MessageLogStatus), default=MessageLogStatus.pending, nullable=False
    )
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False, index=True
    )
