import uuid
from sqlalchemy import ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AutomationTargetCustomer(Base):
    """Links automation settings to specific target customers.
    context = 'repurchase' | 'points'
    """
    __tablename__ = "automation_target_customers"
    __table_args__ = (
        UniqueConstraint("settings_id", "customer_id", "context", name="uq_automation_target_customer"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settings_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("automation_settings.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False
    )
    context: Mapped[str] = mapped_column(Text, nullable=False)
