import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class TenantPlan(str, enum.Enum):
    basic = "basic"
    medium = "medium"
    premium = "premium"


class TenantStatus(str, enum.Enum):
    trial = "trial"
    active = "active"
    canceled = "canceled"
    past_due = "past_due"


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[TenantPlan] = mapped_column(
        SAEnum(TenantPlan), default=TenantPlan.basic, nullable=False
    )
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus), default=TenantStatus.trial, nullable=False
    )
    trial_ends_at: Mapped[datetime | None] = mapped_column(nullable=True)
    timezone: Mapped[str] = mapped_column(String(60), default="America/Santiago", nullable=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")  # noqa: F821
