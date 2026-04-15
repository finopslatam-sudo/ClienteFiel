# backend/app/tasks/automations.py
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from app.tasks.celery_app import celery_app
from app.tasks.reminders import (
    get_booking_with_tenant,
    send_whatsapp_message,
    create_message_log,
    update_message_log,
)

logger = logging.getLogger(__name__)


async def get_automation_settings(tenant_id: str):
    """Retorna AutomationSettings del tenant o None si no existe."""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.automation_settings import AutomationSettings

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AutomationSettings).where(
                AutomationSettings.tenant_id == uuid.UUID(tenant_id)
            )
        )
        return result.scalar_one_or_none()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def send_repurchase_message(self, booking_id: str) -> None:
    """Tarea idempotente: enviar mensaje de recompra post-visita."""
    asyncio.run(_send_repurchase_async(self, booking_id))


async def _send_repurchase_async(task, booking_id: str) -> None:
    booking = await get_booking_with_tenant(booking_id)
    if not booking:
        logger.warning({"event": "repurchase.booking_not_found", "booking_id": booking_id})
        return

    # Idempotencia: no enviar dos veces
    if booking.repurchase_sent_at:
        logger.info({"event": "repurchase.already_sent", "booking_id": booking_id})
        return

    settings = await get_automation_settings(str(booking.tenant_id))
    if not settings or not settings.repurchase_enabled:
        logger.info({"event": "repurchase.disabled", "tenant_id": str(booking.tenant_id)})
        return

    # Verificar que el tenant sigue en plan premium al momento de ejecutar
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.tenant import Tenant, TenantPlan

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(Tenant.id == booking.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant or tenant.plan != TenantPlan.premium:
            logger.info({"event": "repurchase.not_premium", "tenant_id": str(booking.tenant_id)})
            return

    message = settings.repurchase_message or "Hola {nombre}, fue un placer atenderte. ¿Listo para tu próxima cita?"
    customer_name = booking.customer.name or "Cliente"
    service_name = booking.service.name
    business_name = tenant.name

    final_message = (
        message
        .replace("{nombre}", customer_name)
        .replace("{servicio}", service_name)
        .replace("{negocio}", business_name)
    )

    log_id = await create_message_log(
        str(booking.tenant_id), booking_id, str(booking.customer_id), "repurchase"
    )

    try:
        result = await send_whatsapp_message(
            tenant_id=str(booking.tenant_id),
            phone_number=booking.customer.phone_number,
            template_data={
                "type": "template",
                "template": {
                    "name": "repurchase_reminder",
                    "language": {"code": "es"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": customer_name},
                                {"type": "text", "text": service_name},
                                {"type": "text", "text": business_name},
                            ],
                        }
                    ],
                },
            },
        )
        provider_id = result.get("messages", [{}])[0].get("id")
        await update_message_log(log_id, "sent", provider_message_id=provider_id)

        # Marcar como enviado en el booking (idempotencia)
        from app.core.database import AsyncSessionLocal
        from app.models.booking import Booking

        async with AsyncSessionLocal() as db:
            booking_row = await db.get(Booking, uuid.UUID(booking_id))
            if booking_row:
                booking_row.repurchase_sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
                await db.commit()

        logger.info({"event": "repurchase.sent", "booking_id": booking_id, "tenant_id": str(booking.tenant_id)})
    except Exception as exc:
        error_str = type(exc).__name__
        await update_message_log(log_id, "failed", error=error_str)
        logger.error({"event": "repurchase.failed", "booking_id": booking_id, "error": error_str})
        try:
            raise task.retry(exc=exc, countdown=2 ** (task.request.retries + 1) * 60)
        except Exception:
            pass


@celery_app.task
def run_retention_campaigns() -> None:
    """Tarea periódica (Celery Beat cada 24h): detecta clientes inactivos y envía campañas activas."""
    asyncio.run(_run_retention_campaigns_async())


async def _run_retention_campaigns_async() -> None:
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.tenant import Tenant, TenantPlan

    async with AsyncSessionLocal() as db:
        # Solo tenants premium
        tenants_result = await db.execute(
            select(Tenant).where(Tenant.plan == TenantPlan.premium)
        )
        tenants = list(tenants_result.scalars().all())

    for tenant in tenants:
        await _process_tenant_campaigns(str(tenant.id))


async def _process_tenant_campaigns(tenant_id: str) -> None:
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.campaign import Campaign, CampaignTriggerType
    from app.models.customer import Customer
    from app.models.tenant import Tenant

    async with AsyncSessionLocal() as db:
        campaigns_result = await db.execute(
            select(Campaign).where(
                Campaign.tenant_id == uuid.UUID(tenant_id),
                Campaign.active.is_(True),
            )
        )
        campaigns = list(campaigns_result.scalars().all())

        if not campaigns:
            return

        tenant_obj = await db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant_obj:
            return

        for campaign in campaigns:
            if campaign.trigger_type != CampaignTriggerType.inactive_days:
                continue

            now = datetime.now(timezone.utc).replace(tzinfo=None)
            cutoff = now - timedelta(days=campaign.trigger_value)
            cutoff_end = cutoff + timedelta(days=1)

            # Clientes cuya última visita fue hace exactamente trigger_value días
            customers_result = await db.execute(
                select(Customer).where(
                    Customer.tenant_id == uuid.UUID(tenant_id),
                    Customer.last_booking_at >= cutoff,
                    Customer.last_booking_at < cutoff_end,
                )
            )
            customers = list(customers_result.scalars().all())

            for customer in customers:
                await _send_campaign_message(
                    tenant_id=tenant_id,
                    customer=customer,
                    campaign=campaign,
                    business_name=tenant_obj.name,
                )

            campaign.last_run_at = now
        await db.commit()


async def _send_campaign_message(tenant_id: str, customer, campaign, business_name: str) -> None:
    final_message = (
        campaign.message_text
        .replace("{nombre}", customer.name or "Cliente")
        .replace("{negocio}", business_name)
    )

    log_id = await create_message_log(
        tenant_id, None, str(customer.id), "campaign"
    )

    try:
        result = await send_whatsapp_message(
            tenant_id=tenant_id,
            phone_number=customer.phone_number,
            template_data={
                "type": "template",
                "template": {
                    "name": "retention_campaign",
                    "language": {"code": "es"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": customer.name or "Cliente"},
                                {"type": "text", "text": business_name},
                            ],
                        }
                    ],
                },
            },
        )
        provider_id = result.get("messages", [{}])[0].get("id")
        await update_message_log(log_id, "sent", provider_message_id=provider_id)
        logger.info({"event": "campaign.sent", "campaign_id": str(campaign.id), "customer_id": str(customer.id)})
    except Exception as exc:
        error_str = type(exc).__name__
        await update_message_log(log_id, "failed", error=error_str)
        logger.error({"event": "campaign.failed", "campaign_id": str(campaign.id), "error": error_str})
