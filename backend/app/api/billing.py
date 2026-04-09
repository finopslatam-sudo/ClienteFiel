# backend/app/api/billing.py
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_tenant
from app.models.user import User
from app.models.tenant import Tenant, TenantPlan
from app.services.billing_service import BillingService
from app.schemas.billing_profile import BillingProfileResponse, BillingProfileRequest

router = APIRouter(prefix="/billing", tags=["billing"])


class SubscribeRequest(BaseModel):
    plan: TenantPlan
    back_url: str  # URL de retorno después del pago (ej: https://clientefiel.riava.cl/dashboard)


class SubscribeResponse(BaseModel):
    checkout_url: str


class SubscriptionStatusResponse(BaseModel):
    plan: str
    status: str
    provider: str
    external_subscription_id: str | None


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    payload: SubscribeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Inicia una suscripción recurrente con Mercado Pago. Retorna URL de checkout."""
    service = BillingService(db)
    try:
        checkout_url = await service.create_mp_subscription(
            tenant_id=current_tenant.id,
            plan=payload.plan,
            back_url=payload.back_url,
            payer_email=current_user.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return SubscribeResponse(checkout_url=checkout_url)


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retorna el estado de suscripción del tenant actual."""
    service = BillingService(db)
    sub = await service.get_subscription(current_tenant.id)

    if not sub:
        return SubscriptionStatusResponse(
            plan=current_tenant.plan.value,
            status=current_tenant.status.value,
            provider="none",
            external_subscription_id=None,
        )

    return SubscriptionStatusResponse(
        plan=sub.plan.value,
        status=sub.status.value,
        provider=sub.provider.value,
        external_subscription_id=sub.external_subscription_id,
    )


@router.post("/cancel")
async def cancel_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Cancela la suscripción activa del tenant."""
    service = BillingService(db)
    try:
        await service.cancel_subscription(current_tenant.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"message": "Suscripción cancelada"}


@router.get("/profile", response_model=BillingProfileResponse | None)
async def get_billing_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BillingService(db)
    return await service.get_billing_profile(current_tenant.id)


@router.put("/profile", response_model=BillingProfileResponse)
async def upsert_billing_profile(
    payload: BillingProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BillingService(db)
    return await service.upsert_billing_profile(
        tenant_id=current_tenant.id,
        document_type=payload.document_type,
        person_first_name=payload.person_first_name,
        person_last_name=payload.person_last_name,
        person_rut=payload.person_rut,
        person_email=payload.person_email,
        company_name=payload.company_name,
        company_razon_social=payload.company_razon_social,
        company_rut=payload.company_rut,
        company_giro=payload.company_giro,
    )
