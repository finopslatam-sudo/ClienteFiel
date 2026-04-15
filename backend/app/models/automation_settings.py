import uuid
from sqlalchemy import Boolean, Integer, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class AutomationSettings(Base, TimestampMixin):
    __tablename__ = "automation_settings"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_automation_settings_tenant"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    repurchase_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    repurchase_days_after: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    repurchase_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    points_per_visit: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    points_redeem_threshold: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    points_reward_description: Mapped[str | None] = mapped_column(Text, nullable=True)
