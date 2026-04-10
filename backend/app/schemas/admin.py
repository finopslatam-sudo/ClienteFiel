# backend/app/schemas/admin.py
import uuid
from datetime import datetime
from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminTokenResponse(BaseModel):
    access_token: str


class AdminMetricsResponse(BaseModel):
    total_tenants: int
    by_status: dict[str, int]
    by_plan: dict[str, int]
    whatsapp_connected: int
    new_this_month: int


class TenantSubscriptionInfo(BaseModel):
    plan: str
    status: str
    provider: str
    external_subscription_id: str | None

    model_config = {"from_attributes": True}


class TenantSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    status: str
    trial_ends_at: datetime | None
    created_at: datetime
    user_count: int
    whatsapp_connected: bool
    subscription: TenantSubscriptionInfo | None

    model_config = {"from_attributes": True}


class UserInfo(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BillingInfo(BaseModel):
    document_type: str
    person_first_name: str
    person_last_name: str
    person_email: str
    person_rut: str
    company_name: str | None
    company_razon_social: str | None
    company_rut: str | None
    company_giro: str | None
    company_address: str | None

    model_config = {"from_attributes": True}


class WhatsAppCredentialInfo(BaseModel):
    phone_number: str
    phone_number_id: str
    meta_waba_id: str | None
    is_active: bool
    verified_at: datetime | None
    token_expires_at: datetime | None

    model_config = {"from_attributes": True}


class TenantDetail(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    status: str
    trial_ends_at: datetime | None
    created_at: datetime
    subscription: TenantSubscriptionInfo | None
    users: list[UserInfo]
    billing: BillingInfo | None
    whatsapp: WhatsAppCredentialInfo | None

    model_config = {"from_attributes": True}


class ChangePlanRequest(BaseModel):
    plan: str  # basic | medium | premium
