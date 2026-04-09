from pydantic import BaseModel, EmailStr, model_validator
from app.models.billing_profile import DocumentType


class BillingProfileResponse(BaseModel):
    document_type: str
    person_first_name: str
    person_last_name: str
    person_rut: str
    person_email: str
    company_name: str | None
    company_razon_social: str | None
    company_rut: str | None
    company_giro: str | None

    model_config = {"from_attributes": True}


class BillingProfileRequest(BaseModel):
    document_type: DocumentType
    person_first_name: str
    person_last_name: str
    person_rut: str
    person_email: EmailStr
    company_name: str | None = None
    company_razon_social: str | None = None
    company_rut: str | None = None
    company_giro: str | None = None

    @model_validator(mode="after")
    def company_fields_required_for_factura(self) -> "BillingProfileRequest":
        if self.document_type == DocumentType.factura:
            missing = [
                f for f in ("company_name", "company_razon_social", "company_rut", "company_giro")
                if not getattr(self, f)
            ]
            if missing:
                raise ValueError(f"Required for factura: {', '.join(missing)}")
        return self