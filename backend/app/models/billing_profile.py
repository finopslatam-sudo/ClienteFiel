import enum
import uuid
from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class DocumentType(str, enum.Enum):
    boleta = "boleta"
    factura = "factura"


class BillingProfile(Base, TimestampMixin):
    __tablename__ = "billing_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType), nullable=False
    )
    person_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    person_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    person_rut: Mapped[str] = mapped_column(String(20), nullable=False)
    person_email: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_razon_social: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_rut: Mapped[str | None] = mapped_column(String(20), nullable=True)
    company_giro: Mapped[str | None] = mapped_column(String(255), nullable=True)