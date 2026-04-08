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
