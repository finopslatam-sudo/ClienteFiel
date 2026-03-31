# backend/tests/test_whatsapp.py
import pytest
import respx
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

META_EXCHANGE_URL = "https://graph.facebook.com/v19.0/oauth/access_token"
META_PHONE_URL = "https://graph.facebook.com/v19.0/"


@pytest.mark.asyncio
async def test_exchange_code_for_token_calls_meta(db_session: AsyncSession):
    """El exchange de código OAuth llama a Meta Graph API."""
    from app.services.whatsapp_service import WhatsappService

    with respx.mock:
        respx.get(META_EXCHANGE_URL).mock(
            return_value=httpx.Response(200, json={"access_token": "long-lived-token-abc123"})
        )
        service = WhatsappService(db_session)
        token = await service.exchange_code_for_token("auth-code-123")
        assert token == "long-lived-token-abc123"


@pytest.mark.asyncio
async def test_connect_saves_encrypted_credentials(db_session: AsyncSession, tenant):
    """connect() guarda credenciales cifradas en DB, nunca en texto plano."""
    from app.services.whatsapp_service import WhatsappService
    from app.models.whatsapp import WhatsappConnection

    with respx.mock:
        respx.get(META_EXCHANGE_URL).mock(
            return_value=httpx.Response(200, json={"access_token": "my-access-token"})
        )
        respx.get(f"{META_PHONE_URL}123456789").mock(
            return_value=httpx.Response(200, json={"display_phone_number": "+56912345678"})
        )

        service = WhatsappService(db_session)
        conn = await service.connect(
            tenant_id=str(tenant.id),
            code="oauth-code",
            phone_number_id="123456789",
            waba_id="waba-abc",
        )

        assert conn.phone_number_id == "123456789"
        assert conn.phone_number == "+56912345678"
        # El token debe estar cifrado, nunca en texto plano
        assert conn.access_token_enc != b"my-access-token"
        assert b"my-access-token" not in conn.access_token_enc


@pytest.mark.asyncio
async def test_connect_replaces_existing_connection(db_session: AsyncSession, tenant):
    """Si ya hay conexión, connect() la reemplaza."""
    from app.services.whatsapp_service import WhatsappService

    with respx.mock:
        respx.get(META_EXCHANGE_URL).mock(
            return_value=httpx.Response(200, json={"access_token": "token-v1"})
        )
        respx.get(f"{META_PHONE_URL}phone-1").mock(
            return_value=httpx.Response(200, json={"display_phone_number": "+56900000001"})
        )
        service = WhatsappService(db_session)
        conn1 = await service.connect(str(tenant.id), "code1", "phone-1", "waba-1")

        respx.get(META_EXCHANGE_URL).mock(
            return_value=httpx.Response(200, json={"access_token": "token-v2"})
        )
        respx.get(f"{META_PHONE_URL}phone-2").mock(
            return_value=httpx.Response(200, json={"display_phone_number": "+56900000002"})
        )
        conn2 = await service.connect(str(tenant.id), "code2", "phone-2", "waba-2")

        assert conn2.phone_number_id == "phone-2"
        # Solo debe existir 1 conexión por tenant
        from sqlalchemy import select
        from app.models.whatsapp import WhatsappConnection
        result = await db_session.execute(
            select(WhatsappConnection).where(WhatsappConnection.tenant_id == tenant.id)
        )
        connections = result.scalars().all()
        assert len(connections) == 1
