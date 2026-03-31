# backend/app/services/whatsapp_service.py
import uuid
from datetime import datetime, timezone
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.whatsapp import WhatsappConnection
from app.core.security import encrypt_token
from app.core.config import settings

META_GRAPH_URL = "https://graph.facebook.com/v19.0"


class WhatsappService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def exchange_code_for_token(self, code: str) -> str:
        """Intercambiar código OAuth de Embedded Signup por long-lived access token."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{META_GRAPH_URL}/oauth/access_token",
                params={
                    "client_id": settings.meta_app_id,
                    "client_secret": settings.meta_app_secret,
                    "code": code,
                },
            )
            response.raise_for_status()
            data = response.json()
            token = data["access_token"]
        return token

    async def get_phone_number(self, phone_number_id: str, access_token: str) -> str:
        """Obtener número de teléfono formateado desde Meta."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{META_GRAPH_URL}/{phone_number_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "display_phone_number"},
            )
            response.raise_for_status()
            return response.json()["display_phone_number"]

    async def connect(
        self,
        tenant_id: str,
        code: str,
        phone_number_id: str,
        waba_id: str,
    ) -> WhatsappConnection:
        """
        Conectar WhatsApp Business via Embedded Signup.
        Si ya existe conexión previa, la reemplaza (UNIQUE por tenant).
        """
        access_token = await self.exchange_code_for_token(code)
        try:
            phone_number = await self.get_phone_number(phone_number_id, access_token)
            encrypted_token = encrypt_token(access_token)
        finally:
            del access_token  # nunca persistir en texto plano

        tenant_uuid = uuid.UUID(tenant_id)

        # Buscar conexión existente
        result = await self.db.execute(
            select(WhatsappConnection).where(WhatsappConnection.tenant_id == tenant_uuid)
        )
        existing = result.scalar_one_or_none()

        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

        if existing:
            # Reemplazar credenciales
            existing.phone_number_id = phone_number_id
            existing.phone_number = phone_number
            existing.access_token_enc = encrypted_token
            existing.meta_waba_id = waba_id
            existing.is_active = True
            existing.verified_at = now_naive
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        conn = WhatsappConnection(
            tenant_id=tenant_uuid,
            phone_number_id=phone_number_id,
            phone_number=phone_number,
            access_token_enc=encrypted_token,
            meta_waba_id=waba_id,
            is_active=True,
            verified_at=now_naive,
        )
        self.db.add(conn)
        await self.db.commit()
        await self.db.refresh(conn)
        return conn

    async def get_status(self, tenant_id: str) -> WhatsappConnection | None:
        result = await self.db.execute(
            select(WhatsappConnection).where(
                WhatsappConnection.tenant_id == uuid.UUID(tenant_id),
                WhatsappConnection.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def disconnect(self, tenant_id: str) -> None:
        result = await self.db.execute(
            select(WhatsappConnection).where(
                WhatsappConnection.tenant_id == uuid.UUID(tenant_id)
            )
        )
        conn = result.scalar_one_or_none()
        if conn:
            conn.is_active = False
            await self.db.commit()
