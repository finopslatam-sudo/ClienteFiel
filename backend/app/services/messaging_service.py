# backend/app/services/messaging_service.py
import uuid
import httpx
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.whatsapp import WhatsappConnection
from app.core.security import decrypt_token


class MessagingService:
    """Envío de mensajes WhatsApp via Meta Cloud API usando credenciales del tenant."""

    @staticmethod
    async def send_raw_message(tenant_id: str, phone_number: str, payload: dict) -> dict:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WhatsappConnection).where(
                    WhatsappConnection.tenant_id == uuid.UUID(tenant_id),
                    WhatsappConnection.is_active,
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
                        **payload,
                    },
                )
                response.raise_for_status()
                return response.json()
        finally:
            del access_token  # eliminar de memoria inmediatamente

    @classmethod
    async def send_text_message(cls, tenant_id: str, phone_number: str, body: str) -> dict:
        return await cls.send_raw_message(
            tenant_id,
            phone_number,
            {"type": "text", "text": {"body": body}},
        )


async def send_whatsapp_message(tenant_id: str, phone_number: str, template_data: dict) -> dict:
    """Compatibilidad con callers existentes (Celery tasks)."""
    return await MessagingService.send_raw_message(tenant_id, phone_number, template_data)
