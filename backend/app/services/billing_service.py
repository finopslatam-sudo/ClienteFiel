# backend/app/services/billing_service.py
import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import mercadopago

from app.core.config import settings
from app.models.subscription import Subscription, PaymentProvider
from app.models.tenant import Tenant, TenantPlan, TenantStatus

logger = logging.getLogger(__name__)

# Precios en CLP por plan (moneda local para Mercado Pago Chile)
PLAN_PRICES_CLP: dict[TenantPlan, int] = {
    TenantPlan.basic: 20000,
    TenantPlan.medium: 40000,
    TenantPlan.premium: 60000,
}

PLAN_NAMES: dict[TenantPlan, str] = {
    TenantPlan.basic: "Cliente Fiel Básico",
    TenantPlan.medium: "Cliente Fiel Medio",
    TenantPlan.premium: "Cliente Fiel Premium",
}


def _mp_sdk() -> mercadopago.SDK:
    return mercadopago.SDK(settings.mp_access_token)


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_mp_subscription(
        self,
        tenant_id: uuid.UUID,
        plan: TenantPlan,
        back_url: str,
        payer_email: str,
    ) -> str:
        """
        Crea una suscripción recurrente en Mercado Pago (Preapproval).
        Retorna la init_point URL para redirigir al usuario.
        """
        sdk = _mp_sdk()
        amount = PLAN_PRICES_CLP[plan]
        plan_name = PLAN_NAMES[plan]

        preapproval_data = {
            "reason": plan_name,
            "payer_email": payer_email,
            "auto_recurring": {
                "frequency": 1,
                "frequency_type": "months",
                "transaction_amount": amount,
                "currency_id": "CLP",
            },
            "back_url": back_url,
            "status": "pending",
            "external_reference": str(tenant_id),
        }

        response = sdk.preapproval().create(preapproval_data)
        result = response["response"]

        if response["status"] not in (200, 201):
            logger.error({
                "event": "billing.mp_create_failed",
                "tenant_id": str(tenant_id),
                "error": result,
            })
            raise ValueError(f"Mercado Pago error: {result.get('message', 'unknown')}")

        # Guardar ID externo en subscripción (aún en pending hasta que el IPN confirme)
        await self._upsert_subscription(
            tenant_id=tenant_id,
            plan=plan,
            provider=PaymentProvider.mercadopago,
            external_subscription_id=result["id"],
            status=TenantStatus.trial,
        )

        logger.info({
            "event": "billing.mp_subscription_created",
            "tenant_id": str(tenant_id),
            "preapproval_id": result["id"],
        })

        return result["init_point"]

    async def handle_mp_webhook(self, preapproval_id: str) -> None:
        """
        Procesa notificación IPN de Mercado Pago para una suscripción.
        Consulta el estado actual y actualiza la DB.
        """
        sdk = _mp_sdk()
        response = sdk.preapproval().get(preapproval_id)

        if response["status"] != 200:
            logger.warning({
                "event": "billing.mp_webhook_fetch_failed",
                "preapproval_id": preapproval_id,
            })
            return

        data = response["response"]
        mp_status = data.get("status")
        external_reference = data.get("external_reference")  # tenant_id

        if not external_reference:
            return

        try:
            tenant_id = uuid.UUID(external_reference)
        except ValueError:
            return

        status_map = {
            "authorized": TenantStatus.active,
            "paused": TenantStatus.past_due,
            "cancelled": TenantStatus.canceled,
            "pending": TenantStatus.trial,
        }
        new_status = status_map.get(mp_status, TenantStatus.past_due)

        result = await self.db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant_id)
        )
        sub = result.scalar_one_or_none()

        if sub:
            sub.status = new_status
            sub.external_subscription_id = preapproval_id
            sub.external_payer_id = str(data.get("payer_id", ""))
            await self.db.flush()

            # Sincronizar estado en tabla tenants también
            tenant_result = await self.db.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()
            if tenant:
                tenant.status = new_status
                await self.db.flush()

            await self.db.commit()

            logger.info({
                "event": "billing.mp_subscription_updated",
                "tenant_id": str(tenant_id),
                "status": new_status.value,
            })

    async def get_subscription(self, tenant_id: uuid.UUID) -> Subscription | None:
        result = await self.db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def cancel_subscription(self, tenant_id: uuid.UUID) -> None:
        """Cancela la suscripción activa del tenant en Mercado Pago."""
        result = await self.db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant_id)
        )
        sub = result.scalar_one_or_none()

        if not sub or not sub.external_subscription_id:
            raise ValueError("No active subscription found")

        if sub.provider == PaymentProvider.mercadopago:
            sdk = _mp_sdk()
            sdk.preapproval().update(sub.external_subscription_id, {"status": "cancelled"})

        sub.status = TenantStatus.canceled
        await self.db.commit()

        logger.info({
            "event": "billing.subscription_canceled",
            "tenant_id": str(tenant_id),
        })

    async def _upsert_subscription(
        self,
        tenant_id: uuid.UUID,
        plan: TenantPlan,
        provider: PaymentProvider,
        external_subscription_id: str,
        status: TenantStatus,
    ) -> None:
        result = await self.db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant_id)
        )
        sub = result.scalar_one_or_none()

        if sub:
            sub.plan = plan
            sub.provider = provider
            sub.external_subscription_id = external_subscription_id
            sub.status = status
        else:
            sub = Subscription(
                tenant_id=tenant_id,
                plan=plan,
                provider=provider,
                external_subscription_id=external_subscription_id,
                status=status,
            )
            self.db.add(sub)

        await self.db.commit()
