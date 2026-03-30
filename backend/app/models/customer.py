import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class CustomerStatus(str, enum.Enum):
    active = "active"
    vip = "vip"
    churned = "churned"


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uq_customer_tenant_phone"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_booking_at: Mapped[datetime | None] = mapped_column(nullable=True)
    total_bookings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[CustomerStatus] = mapped_column(
        SAEnum(CustomerStatus), default=CustomerStatus.active, nullable=False
    )
