# backend/app/tasks/reminders.py
import asyncio
import logging
import uuid
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def get_booking_with_tenant(booking_id: str):
    """Carga booking con sus relaciones desde DB."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.core.database import AsyncSessionLocal
    from app.models.booking import Booking

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Booking)
            .options(
                selectinload(Booking.customer),
                selectinload(Booking.service),
            )
            .where(Booking.id == uuid.UUID(booking_id))
        )
        return result.scalar_one_or_none()


async def send_whatsapp_message(tenant_id: str, phone_number: str, template_data: dict) -> dict:
    """Enviar mensaje via Meta Cloud API usando credenciales del tenant."""
    import httpx
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.whatsapp import WhatsappConnection
    from app.core.security import decrypt_token

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WhatsappConnection).where(
                WhatsappConnection.tenant_id == uuid.UUID(tenant_id),
                WhatsappConnection.is_active == True,
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            raise ValueError(f"No active WhatsApp connection for tenant {tenant_id}")

        access_token = decrypt_token(conn.access_token_enc)
        phone_number_id = conn.phone_number_id

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"https://graph.facebook.com/v19.0/{phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": phone_number,
                    **template_data,
                },
            )
            response.raise_for_status()
            return response.json()
    finally:
        del access_token  # eliminar de memoria inmediatamente


async def create_message_log(
    tenant_id: str,
    booking_id: str | None,
    customer_id: str | None,
    log_type: str,
) -> str:
    """Crear message_log con status=pending. Retorna el log_id."""
    from app.core.database import AsyncSessionLocal
    from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus

    async with AsyncSessionLocal() as db:
        log = MessageLog(
            tenant_id=uuid.UUID(tenant_id),
            booking_id=uuid.UUID(booking_id) if booking_id else None,
            customer_id=uuid.UUID(customer_id) if customer_id else None,
            type=MessageLogType(log_type),
            status=MessageLogStatus.pending,
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return str(log.id)


async def update_message_log(
    log_id: str, status: str, provider_message_id: str | None = None, error: str | None = None
) -> None:
    """Actualizar message_log a sent o failed."""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.message_log import MessageLog, MessageLogStatus

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(MessageLog).where(MessageLog.id == uuid.UUID(log_id)))
        log = result.scalar_one_or_none()
        if log:
            log.status = MessageLogStatus(status)
            if provider_message_id:
                log.provider_message_id = provider_message_id
            if error:
                log.error_message = error[:500]  # truncar a 500 chars
            await db.commit()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def send_booking_confirmation(self, booking_id: str) -> None:
    """Tarea idempotente: enviar confirmación de reserva por WhatsApp."""
    asyncio.run(_send_booking_confirmation_async(self, booking_id))


async def _send_booking_confirmation_async(task, booking_id: str) -> None:
    booking = await get_booking_with_tenant(booking_id)
    if not booking:
        logger.warning(f"Booking {booking_id} not found, skipping confirmation")
        return

    log_id = await create_message_log(
        str(booking.tenant_id), booking_id, str(booking.customer_id), "confirmation"
    )

    try:
        result = await send_whatsapp_message(
            tenant_id=str(booking.tenant_id),
            phone_number=booking.customer.phone_number,
            template_data={
                "type": "template",
                "template": {
                    "name": "booking_confirmation",
                    "language": {"code": "es"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": booking.customer.name or "Cliente"},
                                {"type": "text", "text": booking.service.name},
                                {"type": "text", "text": booking.scheduled_at.strftime("%A %d/%m a las %H:%M")},
                            ],
                        }
                    ],
                },
            },
        )
        provider_id = result.get("messages", [{}])[0].get("id")
        await update_message_log(log_id, "sent", provider_message_id=provider_id)
        logger.info({"event": "confirmation.sent", "booking_id": booking_id, "tenant_id": str(booking.tenant_id)})
    except Exception as exc:
        error_str = type(exc).__name__  # solo el tipo, nunca el token
        await update_message_log(log_id, "failed", error=error_str)
        logger.error({"event": "confirmation.failed", "booking_id": booking_id, "error": error_str})
        try:
            raise task.retry(exc=exc, countdown=2 ** (task.request.retries + 1) * 60)
        except Exception:
            pass


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def send_reminder_24h(self, booking_id: str) -> None:
    asyncio.run(_send_reminder_async(self, booking_id, "reminder_24h", "reminder_24h"))


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def send_reminder_1h(self, booking_id: str) -> None:
    asyncio.run(_send_reminder_async(self, booking_id, "reminder_1h", "reminder_1h"))


async def _send_reminder_async(task, booking_id: str, log_type: str, template_name: str) -> None:
    booking = await get_booking_with_tenant(booking_id)
    if not booking:
        logger.warning(f"Booking {booking_id} not found, skipping {log_type}")
        return

    from app.models.booking import BookingStatus
    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        logger.info(f"Booking {booking_id} status={booking.status.value}, skipping {log_type}")
        return

    log_id = await create_message_log(
        str(booking.tenant_id), booking_id, str(booking.customer_id), log_type
    )

    try:
        result = await send_whatsapp_message(
            tenant_id=str(booking.tenant_id),
            phone_number=booking.customer.phone_number,
            template_data={
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "es"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": booking.customer.name or "Cliente"},
                                {"type": "text", "text": booking.service.name},
                                {"type": "text", "text": booking.scheduled_at.strftime("%A %d/%m a las %H:%M")},
                            ],
                        }
                    ],
                },
            },
        )
        provider_id = result.get("messages", [{}])[0].get("id")
        await update_message_log(log_id, "sent", provider_message_id=provider_id)
        logger.info({"event": f"{log_type}.sent", "booking_id": booking_id})
    except Exception as exc:
        error_str = type(exc).__name__
        await update_message_log(log_id, "failed", error=error_str)
        logger.error({"event": f"{log_type}.failed", "booking_id": booking_id, "error": error_str})
        try:
            raise task.retry(exc=exc, countdown=2 ** (task.request.retries + 1) * 60)
        except Exception:
            pass
