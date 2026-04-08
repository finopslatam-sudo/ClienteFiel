# backend/app/models/subscription.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, Enum as SAEnum, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantPlan, TenantStatus


class PaymentProvider(str, enum.Enum):
    mercadopago = "mercadopago"
    paypal = "paypal"
    webpay = "webpay"
    none = "none"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    plan: Mapped[TenantPlan] = mapped_column(
        SAEnum(TenantPlan), default=TenantPlan.basic, nullable=False
    )
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus), default=TenantStatus.trial, nullable=False
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        SAEnum(PaymentProvider), default=PaymentProvider.none, nullable=False
    )
    # ID externo del proveedor (preapproval_id en MP, subscription_id en PayPal)
    external_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # ID del payer en el proveedor (para referencia y soporte)
    external_payer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(nullable=True)
    cancel_at: Mapped[datetime | None] = mapped_column(nullable=True)
