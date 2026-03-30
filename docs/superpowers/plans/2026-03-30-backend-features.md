# Cliente Fiel — Backend Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisito:** Plan 1 (backend-foundation) completado y todos sus tests pasando.

**Goal:** Implementar todas las features del MVP: WhatsApp Embedded Signup, servicios y horarios, clientes, reservas (CRUD + creación manual), webhooks Meta (idempotente) y Stripe, Celery con reminders automáticos, rate limiting, y dashboard summary.

**Architecture:** FastAPI routers nuevos, cada uno con su service correspondiente. Celery workers separados para tareas async. Webhooks validan firma antes de procesar. Idempotencia en webhook Meta via Redis. WhatsApp tokens: descifrados solo en memoria, eliminados después del uso. message_logs creados en pending antes de cada envío, actualizados a sent/failed después.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, httpx (timeout=5s), Celery + Redis, Stripe SDK, cryptography.Fernet, slowapi, pytest-asyncio, respx (mock httpx en tests)

---

## File Map

```
backend/app/
├── api/
│   ├── whatsapp.py          — connect, status, disconnect, test
│   ├── services_router.py   — CRUD servicios del tenant
│   ├── time_slots.py        — CRUD bloques horarios
│   ├── clients.py           — lista, detalle, update clientes
│   ├── bookings.py          — CRUD + cancel/complete/no-show
│   ├── webhooks.py          — Meta + Stripe webhooks
│   ├── dashboard.py         — summary + agenda semanal
│   ├── subscriptions.py     — Stripe checkout, status, portal
│   └── logs.py              — message_logs con filtros
├── services/
│   ├── whatsapp_service.py  — connect OAuth, send_message, verify
│   ├── booking_service.py   — crear, cancelar, completar reservas
│   ├── reminder_service.py  — schedule_reminders, cancel_reminders
│   └── stripe_service.py    — checkout session, portal, webhook handler
├── tasks/
│   ├── __init__.py
│   ├── celery_app.py        — Celery app factory
│   └── reminders.py         — send_confirmation, send_reminder_24h, send_reminder_1h
└── core/
    └── redis_client.py      — Redis client para idempotencia y conv states

tests/
├── test_whatsapp.py         — connect flow, idempotencia
├── test_bookings.py         — CRUD, cancel, complete, no-show
├── test_webhooks.py         — Meta valid/invalid sig, Stripe, duplicados
├── test_reminders.py        — schedule, Celery task mock
└── test_dashboard.py        — summary counts
```

---

## Task 1: Redis Client

**Files:**
- Create: `backend/app/core/redis_client.py`

- [ ] **Step 1: Implementar redis_client.py**

```python
# backend/app/core/redis_client.py
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def is_message_processed(meta_message_id: str) -> bool:
    """Idempotencia: retorna True si el mensaje ya fue procesado."""
    redis = await get_redis()
    key = f"wa_msg:{meta_message_id}"
    return await redis.exists(key) == 1


async def mark_message_processed(meta_message_id: str, ttl_seconds: int = 86400) -> None:
    """Marcar mensaje como procesado. TTL default: 24 horas."""
    redis = await get_redis()
    key = f"wa_msg:{meta_message_id}"
    await redis.set(key, "1", ex=ttl_seconds)


async def get_conversation_state(phone_number: str, tenant_id: str) -> dict | None:
    """Estado de conversación WhatsApp para máquina de estados."""
    import json
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    data = await redis.get(key)
    return json.loads(data) if data else None


async def set_conversation_state(
    phone_number: str, tenant_id: str, state: dict, ttl_seconds: int = 1800
) -> None:
    """Guardar estado de conversación con TTL de 30 minutos."""
    import json
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    await redis.set(key, json.dumps(state), ex=ttl_seconds)


async def clear_conversation_state(phone_number: str, tenant_id: str) -> None:
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    await redis.delete(key)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/redis_client.py
git commit -m "feat: add async Redis client with idempotency and conversation state helpers"
```

---

## Task 2: Celery App y Tarea de Confirmación

**Files:**
- Create: `backend/app/tasks/__init__.py`
- Create: `backend/app/tasks/celery_app.py`
- Create: `backend/app/tasks/reminders.py`
- Create: `backend/tests/test_reminders.py`

- [ ] **Step 1: Crear celery_app.py**

```python
# backend/app/tasks/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "clientefiel",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.reminders"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Santiago",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
```

- [ ] **Step 2: Crear app/tasks/__init__.py**

```python
# backend/app/tasks/__init__.py
from app.tasks.celery_app import celery_app

__all__ = ["celery_app"]
```

- [ ] **Step 3: Escribir tests que fallan para reminders**

```python
# backend/tests/test_reminders.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.tasks.reminders import (
    send_booking_confirmation,
    send_reminder_24h,
    send_reminder_1h,
)


@pytest.mark.asyncio
async def test_send_confirmation_calls_whatsapp_service():
    booking_id = "test-booking-uuid"
    with patch("app.tasks.reminders.send_whatsapp_message") as mock_send:
        mock_send.return_value = {"messages": [{"id": "meta-msg-id-123"}]}
        with patch("app.tasks.reminders.get_booking_with_tenant") as mock_get:
            mock_booking = MagicMock()
            mock_booking.id = booking_id
            mock_booking.tenant_id = "tenant-uuid"
            mock_booking.customer.phone_number = "+56912345678"
            mock_booking.service.name = "Corte de pelo"
            mock_booking.scheduled_at.strftime.return_value = "Martes 10:00"
            mock_get.return_value = mock_booking
            with patch("app.tasks.reminders.update_message_log") as mock_log:
                await send_booking_confirmation(booking_id)
                mock_send.assert_called_once()
                mock_log.assert_called()


@pytest.mark.asyncio
async def test_send_confirmation_handles_whatsapp_error():
    booking_id = "test-booking-uuid"
    with patch("app.tasks.reminders.send_whatsapp_message") as mock_send:
        mock_send.side_effect = Exception("Meta API error")
        with patch("app.tasks.reminders.get_booking_with_tenant") as mock_get:
            mock_booking = MagicMock()
            mock_booking.id = booking_id
            mock_booking.tenant_id = "tenant-uuid"
            mock_booking.customer.phone_number = "+56912345678"
            mock_get.return_value = mock_booking
            with patch("app.tasks.reminders.update_message_log") as mock_log:
                # No debe lanzar excepción no controlada
                await send_booking_confirmation(booking_id)
                # Log debe registrar status=failed
                calls = [str(c) for c in mock_log.call_args_list]
                assert any("failed" in c for c in calls)
```

- [ ] **Step 4: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_reminders.py -v
```

Resultado esperado: `ImportError`

- [ ] **Step 5: Implementar app/tasks/reminders.py**

```python
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
```

- [ ] **Step 6: Ejecutar tests**

```bash
python -m pytest tests/test_reminders.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/tasks/ backend/tests/test_reminders.py
git commit -m "feat: add Celery app and async reminder tasks (confirmation, 24h, 1h)"
```

---

## Task 3: WhatsApp Service

**Files:**
- Create: `backend/app/services/whatsapp_service.py`
- Create: `backend/tests/test_whatsapp.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# backend/tests/test_whatsapp.py
import pytest
import respx
import httpx
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

META_EXCHANGE_URL = "https://graph.facebook.com/v19.0/oauth/access_token"
META_PHONE_URL = "https://graph.facebook.com/v19.0/"


@pytest.mark.asyncio
async def test_exchange_code_for_token_calls_meta(db_session):
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
async def test_connect_saves_encrypted_credentials(db_session, tenant):
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
async def test_connect_replaces_existing_connection(db_session, tenant):
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
```

- [ ] **Step 2: Agregar fixtures de tenant a conftest.py**

```python
# Agregar al final de backend/tests/conftest.py
import pytest_asyncio
from app.models.tenant import Tenant, TenantPlan, TenantStatus
from datetime import datetime, timedelta, timezone


@pytest_asyncio.fixture
async def db_session(db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    async_session = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def tenant(db_session: AsyncSession):
    t = Tenant(
        name="Test Negocio",
        slug="test-negocio-abc123",
        plan=TenantPlan.basic,
        status=TenantStatus.trial,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return t
```

- [ ] **Step 3: Ejecutar tests para verificar que fallan**

```bash
pip install respx
python -m pytest tests/test_whatsapp.py -v
```

Resultado esperado: `ImportError: cannot import name 'WhatsappService'`

- [ ] **Step 4: Implementar app/services/whatsapp_service.py**

```python
# backend/app/services/whatsapp_service.py
import uuid
from datetime import datetime, timezone
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.whatsapp import WhatsappConnection
from app.core.security import encrypt_token, decrypt_token
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

        if existing:
            # Reemplazar credenciales
            existing.phone_number_id = phone_number_id
            existing.phone_number = phone_number
            existing.access_token_enc = encrypted_token
            existing.meta_waba_id = waba_id
            existing.is_active = True
            existing.verified_at = datetime.now(timezone.utc)
            existing.updated_at = datetime.now(timezone.utc)
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
            verified_at=datetime.now(timezone.utc),
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
```

- [ ] **Step 5: Ejecutar tests**

```bash
python -m pytest tests/test_whatsapp.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/whatsapp_service.py backend/tests/test_whatsapp.py backend/tests/conftest.py
git commit -m "feat: add WhatsApp service (Embedded Signup connect, replace, disconnect)"
```

---

## Task 4: WhatsApp Router

**Files:**
- Create: `backend/app/api/whatsapp.py`
- Create: `backend/app/schemas/whatsapp.py`

- [ ] **Step 1: Crear schemas/whatsapp.py**

```python
# backend/app/schemas/whatsapp.py
from pydantic import BaseModel


class WhatsappConnectRequest(BaseModel):
    code: str
    phone_number_id: str
    waba_id: str


class WhatsappStatusResponse(BaseModel):
    connected: bool
    phone_number: str | None = None
    verified_at: str | None = None
```

- [ ] **Step 2: Crear api/whatsapp.py**

```python
# backend/app/api/whatsapp.py
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_tenant
from app.models.user import User
from app.models.tenant import Tenant
from app.services.whatsapp_service import WhatsappService
from app.schemas.whatsapp import WhatsappConnectRequest, WhatsappStatusResponse

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.post("/connect", response_model=WhatsappStatusResponse)
async def connect_whatsapp(
    payload: WhatsappConnectRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    try:
        conn = await service.connect(
            tenant_id=str(current_tenant.id),
            code=payload.code,
            phone_number_id=payload.phone_number_id,
            waba_id=payload.waba_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect WhatsApp: {type(e).__name__}")
    return WhatsappStatusResponse(
        connected=True,
        phone_number=conn.phone_number,
        verified_at=conn.verified_at.isoformat() if conn.verified_at else None,
    )


@router.get("/status", response_model=WhatsappStatusResponse)
async def get_whatsapp_status(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    conn = await service.get_status(str(current_tenant.id))
    if not conn:
        return WhatsappStatusResponse(connected=False)
    return WhatsappStatusResponse(
        connected=True,
        phone_number=conn.phone_number,
        verified_at=conn.verified_at.isoformat() if conn.verified_at else None,
    )


@router.post("/disconnect")
async def disconnect_whatsapp(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    await service.disconnect(str(current_tenant.id))
    return {"message": "WhatsApp disconnected"}
```

- [ ] **Step 3: Registrar router en main.py**

```python
# backend/app/main.py — agregar después del router de auth
from app.api import auth, whatsapp as whatsapp_router

# ... (código existente de middleware y CORS) ...

app.include_router(auth.router, prefix="/api/v1")
app.include_router(whatsapp_router.router, prefix="/api/v1")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/whatsapp.py backend/app/schemas/whatsapp.py backend/app/main.py
git commit -m "feat: add WhatsApp router (connect, status, disconnect)"
```

---

## Task 5: Booking Service y Router

**Files:**
- Create: `backend/app/services/booking_service.py`
- Create: `backend/app/schemas/booking.py`
- Create: `backend/app/api/bookings.py`
- Create: `backend/tests/test_bookings.py`

- [ ] **Step 1: Crear schemas/booking.py**

```python
# backend/app/schemas/booking.py
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.booking import BookingStatus, BookingCreatedBy


class BookingCreateRequest(BaseModel):
    customer_phone: str
    customer_name: str | None = None
    service_id: uuid.UUID
    scheduled_at: datetime


class BookingResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    service_id: uuid.UUID
    scheduled_at: datetime
    status: BookingStatus
    created_by: BookingCreatedBy
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int
```

- [ ] **Step 2: Escribir tests que fallan**

```python
# backend/tests/test_bookings.py
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_create_booking_manual(client: AsyncClient):
    """Admin puede crear reserva manualmente."""
    token = await register_and_login(client, "bookings@test.cl", "Spa Test")

    # Crear servicio primero
    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Masaje", "duration_minutes": 60, "price": "25000"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert svc_resp.status_code == 201
    service_id = svc_resp.json()["id"]

    # Crear reserva
    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "customer_phone": "+56911111111",
            "customer_name": "Ana García",
            "service_id": service_id,
            "scheduled_at": scheduled,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["created_by"] == "admin"


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient):
    """Admin puede cancelar una reserva."""
    token = await register_and_login(client, "cancel@test.cl", "Peluquería Cancel")

    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Corte", "duration_minutes": 30, "price": "10000"},
        headers={"Authorization": f"Bearer {token}"},
    )
    service_id = svc_resp.json()["id"]

    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    booking_resp = await client.post(
        "/api/v1/bookings",
        json={"customer_phone": "+56922222222", "service_id": service_id, "scheduled_at": scheduled},
        headers={"Authorization": f"Bearer {token}"},
    )
    booking_id = booking_resp.json()["id"]

    cancel_resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "canceled"


@pytest.mark.asyncio
async def test_booking_isolation_between_tenants(client: AsyncClient):
    """Un tenant no puede ver reservas de otro tenant."""
    token_a = await register_and_login(client, "tenant_book_a@test.cl", "Negocio A")
    token_b = await register_and_login(client, "tenant_book_b@test.cl", "Negocio B")

    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Corte", "duration_minutes": 30, "price": "10000"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    service_id = svc_resp.json()["id"]
    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    booking_resp = await client.post(
        "/api/v1/bookings",
        json={"customer_phone": "+56933333333", "service_id": service_id, "scheduled_at": scheduled},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    booking_id = booking_resp.json()["id"]

    # Tenant B intenta cancelar la reserva de tenant A
    resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404  # no debe encontrarla
```

- [ ] **Step 3: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_bookings.py -v
```

Resultado esperado: `ImportError` o `404`

- [ ] **Step 4: Implementar app/services/booking_service.py**

```python
# backend/app/services/booking_service.py
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.booking import Booking, BookingStatus, BookingCreatedBy
from app.models.customer import Customer, CustomerStatus
from app.models.service import Service


class BookingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_create_customer(
        self, tenant_id: uuid.UUID, phone_number: str, name: str | None
    ) -> Customer:
        result = await self.db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.phone_number == phone_number,
            )
        )
        customer = result.scalar_one_or_none()
        if not customer:
            customer = Customer(
                tenant_id=tenant_id,
                phone_number=phone_number,
                name=name,
                status=CustomerStatus.active,
            )
            self.db.add(customer)
            await self.db.flush()
        elif name and not customer.name:
            customer.name = name
        return customer

    async def create_booking(
        self,
        tenant_id: uuid.UUID,
        customer_phone: str,
        customer_name: str | None,
        service_id: uuid.UUID,
        scheduled_at: datetime,
        created_by: BookingCreatedBy = BookingCreatedBy.admin,
    ) -> Booking:
        # Verificar servicio pertenece al tenant
        result = await self.db.execute(
            select(Service).where(
                Service.id == service_id,
                Service.tenant_id == tenant_id,
                Service.is_active == True,
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise ValueError("Service not found or inactive")

        customer = await self._get_or_create_customer(tenant_id, customer_phone, customer_name)

        booking = Booking(
            tenant_id=tenant_id,
            customer_id=customer.id,
            service_id=service_id,
            scheduled_at=scheduled_at,
            status=BookingStatus.confirmed,
            created_by=created_by,
        )
        self.db.add(booking)

        # Actualizar stats del cliente
        customer.total_bookings += 1
        customer.last_booking_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def get_booking(self, tenant_id: uuid.UUID, booking_id: uuid.UUID) -> Booking | None:
        result = await self.db.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == tenant_id,  # CRÍTICO: siempre filtrar por tenant
            )
        )
        return result.scalar_one_or_none()

    async def list_bookings(
        self,
        tenant_id: uuid.UUID,
        status: BookingStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Booking]:
        query = select(Booking).where(Booking.tenant_id == tenant_id)
        if status:
            query = query.where(Booking.status == status)
        if date_from:
            query = query.where(Booking.scheduled_at >= date_from)
        if date_to:
            query = query.where(Booking.scheduled_at <= date_to)
        query = query.order_by(Booking.scheduled_at)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_status(
        self, tenant_id: uuid.UUID, booking_id: uuid.UUID, new_status: BookingStatus
    ) -> Booking:
        booking = await self.get_booking(tenant_id, booking_id)
        if not booking:
            raise ValueError("Booking not found")
        booking.status = new_status
        await self.db.commit()
        await self.db.refresh(booking)
        return booking
```

- [ ] **Step 5: Implementar api/bookings.py**

```python
# backend/app/api/bookings.py
import uuid
from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.booking import BookingStatus, BookingCreatedBy
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreateRequest, BookingResponse, BookingListResponse
from app.tasks.reminders import send_booking_confirmation, send_reminder_24h, send_reminder_1h
from datetime import timedelta

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    payload: BookingCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.create_booking(
            tenant_id=current_tenant.id,
            customer_phone=payload.customer_phone,
            customer_name=payload.customer_name,
            service_id=payload.service_id,
            scheduled_at=payload.scheduled_at,
            created_by=BookingCreatedBy.admin,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Programar reminders en Celery
    send_booking_confirmation.delay(str(booking.id))
    dt_24h = booking.scheduled_at - timedelta(hours=24)
    dt_1h = booking.scheduled_at - timedelta(hours=1)
    send_reminder_24h.apply_async(args=[str(booking.id)], eta=dt_24h)
    send_reminder_1h.apply_async(args=[str(booking.id)], eta=dt_1h)

    return BookingResponse.model_validate(booking)


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: BookingStatus | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
):
    service = BookingService(db)
    bookings = await service.list_bookings(
        tenant_id=current_tenant.id, status=status, date_from=date_from, date_to=date_to
    )
    return BookingListResponse(
        bookings=[BookingResponse.model_validate(b) for b in bookings],
        total=len(bookings),
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    booking = await service.get_booking(current_tenant.id, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.canceled)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.completed)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}/no-show", response_model=BookingResponse)
async def no_show_booking(
    booking_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BookingService(db)
    try:
        booking = await service.update_status(current_tenant.id, booking_id, BookingStatus.no_show)
    except ValueError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(booking)
```

- [ ] **Step 6: Ejecutar tests**

```bash
python -m pytest tests/test_bookings.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/booking_service.py backend/app/api/bookings.py backend/app/schemas/booking.py backend/tests/test_bookings.py
git commit -m "feat: add booking service and router (CRUD, cancel, complete, no-show)"
```

---

## Task 6: Services y Time Slots Router

**Files:**
- Create: `backend/app/schemas/service.py`
- Create: `backend/app/api/services_router.py`
- Create: `backend/app/api/time_slots.py`

- [ ] **Step 1: Crear schemas/service.py**

```python
# backend/app/schemas/service.py
import uuid
from decimal import Decimal
from pydantic import BaseModel


class ServiceCreateRequest(BaseModel):
    name: str
    duration_minutes: int
    price: Decimal


class ServiceResponse(BaseModel):
    id: uuid.UUID
    name: str
    duration_minutes: int
    price: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


class TimeSlotCreateRequest(BaseModel):
    day_of_week: int  # 0=lunes, 6=domingo
    start_time: str   # "09:00"
    end_time: str     # "18:00"
    max_concurrent: int = 1


class TimeSlotResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    start_time: str
    end_time: str
    max_concurrent: int
    is_active: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Implementar api/services_router.py**

```python
# backend/app/api/services_router.py
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, require_admin
from app.models.tenant import Tenant
from app.models.user import User
from app.models.service import Service
from app.schemas.service import ServiceCreateRequest, ServiceResponse

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Service).where(
            Service.tenant_id == current_tenant.id,
            Service.is_active == True,
        )
    )
    return [ServiceResponse.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    payload: ServiceCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = Service(
        tenant_id=current_tenant.id,
        name=payload.name,
        duration_minutes=payload.duration_minutes,
        price=payload.price,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return ServiceResponse.model_validate(service)


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: uuid.UUID,
    payload: ServiceCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id, Service.tenant_id == current_tenant.id
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.name = payload.name
    service.duration_minutes = payload.duration_minutes
    service.price = payload.price
    await db.commit()
    await db.refresh(service)
    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}", status_code=204)
async def deactivate_service(
    service_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id, Service.tenant_id == current_tenant.id
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.is_active = False
    await db.commit()
```

- [ ] **Step 3: Registrar routers en main.py**

```python
# backend/app/main.py — sección de includes
from app.api import auth, whatsapp as whatsapp_router, services_router, bookings as bookings_router

app.include_router(auth.router, prefix="/api/v1")
app.include_router(whatsapp_router.router, prefix="/api/v1")
app.include_router(services_router.router, prefix="/api/v1")
app.include_router(bookings_router.router, prefix="/api/v1")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/services_router.py backend/app/schemas/service.py backend/app/main.py
git commit -m "feat: add services CRUD router (list, create, update, deactivate)"
```

---

## Task 7: Webhook Meta (Idempotente) y Stripe

**Files:**
- Create: `backend/app/api/webhooks.py`
- Create: `backend/tests/test_webhooks.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# backend/tests/test_webhooks.py
import pytest
import json
import hmac
import hashlib
from httpx import AsyncClient
from app.core.config import settings


def make_meta_signature(payload: str, secret: str) -> str:
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"sha256={sig}"


@pytest.mark.asyncio
async def test_meta_webhook_verification_challenge(client: AsyncClient):
    """Meta verifica el webhook con un GET challenge."""
    response = await client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.meta_webhook_verify_token,
            "hub.challenge": "test-challenge-12345",
        },
    )
    assert response.status_code == 200
    assert response.text == "test-challenge-12345"


@pytest.mark.asyncio
async def test_meta_webhook_invalid_token(client: AsyncClient):
    """Verificación falla con token incorrecto."""
    response = await client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "challenge",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_invalid_signature(client: AsyncClient):
    """POST con firma inválida retorna 403."""
    payload = json.dumps({"entry": []})
    response = await client.post(
        "/api/webhooks/whatsapp",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalidsignature",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_valid_signature_returns_200(client: AsyncClient):
    """POST con firma válida retorna 200 OK."""
    payload = json.dumps({"object": "whatsapp_business_account", "entry": []})
    sig = make_meta_signature(payload, settings.meta_app_secret)
    response = await client.post(
        "/api/webhooks/whatsapp",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": sig,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_meta_webhook_duplicate_message_ignored(client: AsyncClient):
    """El mismo meta_message_id procesado dos veces solo se procesa una vez."""
    # Este test verifica idempotencia — el segundo POST retorna 200 pero no procesa
    payload = json.dumps({
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{"id": "wamid.unique-test-id-123", "type": "text"}]
                }
            }]
        }]
    })
    sig = make_meta_signature(payload, settings.meta_app_secret)
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": sig,
    }
    r1 = await client.post("/api/webhooks/whatsapp", content=payload, headers=headers)
    r2 = await client.post("/api/webhooks/whatsapp", content=payload, headers=headers)
    assert r1.status_code == 200
    assert r2.status_code == 200  # retorna 200 pero no procesa el duplicado
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_webhooks.py -v
```

Resultado esperado: `404` o `ImportError`

- [ ] **Step 3: Implementar api/webhooks.py**

```python
# backend/app/api/webhooks.py
import hashlib
import hmac
import json
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import is_message_processed, mark_message_processed
from app.models.whatsapp import WhatsappConnection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_meta_signature(payload: bytes, signature_header: str) -> bool:
    """Validar X-Hub-Signature-256 de Meta."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.meta_app_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    received = signature_header.split("sha256=", 1)[1]
    return hmac.compare_digest(expected, received)


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    """Meta verifica el endpoint con este GET antes de activar el webhook."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_webhook_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Recibir mensajes entrantes de WhatsApp. Siempre retornar 200 en < 20 seg."""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    if not _verify_meta_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=200)  # Meta espera 200 siempre

    # Extraer mensajes y verificar idempotencia
    entries = data.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            messages = change.get("value", {}).get("messages", [])
            for message in messages:
                meta_message_id = message.get("id")
                if not meta_message_id:
                    continue

                # Idempotencia: ignorar mensajes ya procesados
                if await is_message_processed(meta_message_id):
                    logger.info({"event": "webhook.duplicate", "meta_message_id": meta_message_id})
                    continue

                await mark_message_processed(meta_message_id)

                # Identificar tenant por phone_number_id
                phone_number_id = change.get("value", {}).get("metadata", {}).get("phone_number_id")
                if phone_number_id:
                    result = await db.execute(
                        select(WhatsappConnection).where(
                            WhatsappConnection.phone_number_id == phone_number_id,
                            WhatsappConnection.is_active == True,
                        )
                    )
                    conn = result.scalar_one_or_none()
                    if conn:
                        # Encolar en Celery para procesamiento async
                        logger.info({
                            "event": "webhook.received",
                            "tenant_id": str(conn.tenant_id),
                            "meta_message_id": meta_message_id,
                        })
                        # TODO Plan 2 feature: process_incoming_message.delay(str(conn.tenant_id), message)

    return Response(status_code=200)


@router.post("/stripe")
async def receive_stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Procesar eventos de Stripe para actualizar estado de suscripción."""
    import stripe
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(body, sig, settings.stripe_webhook_secret)
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    from sqlalchemy import update
    from app.models.subscription import Subscription
    from app.models.tenant import Tenant, TenantStatus

    if event["type"] == "customer.subscription.updated":
        sub_data = event["data"]["object"]
        stripe_sub_id = sub_data["id"]
        new_status = sub_data["status"]  # active, past_due, canceled, etc.
        status_map = {
            "active": TenantStatus.active,
            "past_due": TenantStatus.past_due,
            "canceled": TenantStatus.canceled,
        }
        if new_status in status_map:
            await db.execute(
                update(Subscription)
                .where(Subscription.stripe_subscription_id == stripe_sub_id)
                .values(status=status_map[new_status])
            )
            await db.commit()
            logger.info({"event": "stripe.subscription.updated", "status": new_status})

    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        await db.execute(
            update(Subscription)
            .where(Subscription.stripe_subscription_id == sub_data["id"])
            .values(status=TenantStatus.canceled)
        )
        await db.commit()

    return {"status": "ok"}
```

- [ ] **Step 4: Ejecutar tests**

```bash
python -m pytest tests/test_webhooks.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 5: Registrar webhook router en main.py**

```python
# backend/app/main.py — agregar
from app.api import webhooks as webhooks_router
app.include_router(webhooks_router.router, prefix="/api")
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/webhooks.py backend/tests/test_webhooks.py backend/app/main.py
git commit -m "feat: add Meta and Stripe webhook handlers with signature validation and idempotency"
```

---

## Task 8: Rate Limiting

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Agregar slowapi rate limiting**

```python
# backend/app/main.py — agregar al inicio y al setup del app
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

```python
# backend/app/api/auth.py — decorar el endpoint de login
from app.main import limiter
from fastapi import Request

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minutes")
async def login(
    request: Request,       # requerido por slowapi
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # ... código existente sin cambios ...
```

- [ ] **Step 2: Verificar manualmente que rate limit funciona**

```bash
# Ejecutar 6 intentos de login fallido rápidamente
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"nobody@test.cl","password":"wrong"}'
done
```

Resultado esperado: los primeros 5 retornan `401`, el 6to retorna `429`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py backend/app/api/auth.py
git commit -m "feat: add slowapi rate limiting on login endpoint (5/15min per IP)"
```

---

## Task 9: Dashboard y Logs

**Files:**
- Create: `backend/app/api/dashboard.py`
- Create: `backend/app/api/logs.py`

- [ ] **Step 1: Implementar api/dashboard.py**

```python
# backend/app/api/dashboard.py
from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.booking import Booking, BookingStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Reservas de hoy
    result_today = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.scheduled_at >= today_start,
            Booking.scheduled_at < today_end,
        )
    )
    bookings_today = result_today.scalar() or 0

    # Reservas pendientes/confirmadas (próximas)
    result_pending = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == current_tenant.id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.scheduled_at >= datetime.now(timezone.utc),
        )
    )
    bookings_pending = result_pending.scalar() or 0

    return {
        "bookings_today": bookings_today,
        "bookings_pending": bookings_pending,
    }


@router.get("/agenda")
async def get_agenda(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    week: datetime | None = Query(default=None),
):
    if not week:
        week = datetime.now(timezone.utc)
    week_start = week.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(Booking).where(
            Booking.tenant_id == current_tenant.id,
            Booking.scheduled_at >= week_start,
            Booking.scheduled_at < week_end,
        ).order_by(Booking.scheduled_at)
    )
    bookings = result.scalars().all()
    return {"bookings": [{"id": str(b.id), "scheduled_at": b.scheduled_at.isoformat(), "status": b.status.value} for b in bookings]}
```

- [ ] **Step 2: Implementar api/logs.py**

```python
# backend/app/api/logs.py
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, require_admin
from app.models.tenant import Tenant
from app.models.user import User
from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/messages")
async def list_message_logs(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: MessageLogStatus | None = Query(default=None),
    type: MessageLogType | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
):
    query = select(MessageLog).where(MessageLog.tenant_id == current_tenant.id)
    if status:
        query = query.where(MessageLog.status == status)
    if type:
        query = query.where(MessageLog.type == type)
    if date_from:
        query = query.where(MessageLog.created_at >= date_from)
    if date_to:
        query = query.where(MessageLog.created_at <= date_to)

    query = query.order_by(MessageLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "type": log.type.value,
                "status": log.status.value,
                "provider_message_id": log.provider_message_id,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": len(logs),
    }
```

- [ ] **Step 3: Registrar routers en main.py**

```python
from app.api import dashboard as dashboard_router, logs as logs_router

app.include_router(dashboard_router.router, prefix="/api/v1")
app.include_router(logs_router.router, prefix="/api/v1")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/dashboard.py backend/app/api/logs.py backend/app/main.py
git commit -m "feat: add dashboard summary, weekly agenda, and message_logs endpoint"
```

---

## Task 10: Verificación Final

- [ ] **Step 1: Ejecutar suite completa**

```bash
cd backend
python -m pytest tests/ -v --cov=app --cov-report=term-missing
```

Resultado esperado: todos los tests pasan, cobertura > 70%.

- [ ] **Step 2: Verificar todos los endpoints en Swagger**

```bash
uvicorn app.main:app --reload --port 8000
```

Abrir `http://localhost:8000/docs` y verificar que aparecen todos los routers:
- `/api/v1/auth/*`
- `/api/v1/whatsapp/*`
- `/api/v1/services/*`
- `/api/v1/bookings/*`
- `/api/v1/dashboard/*`
- `/api/v1/logs/*`
- `/api/webhooks/*`

- [ ] **Step 3: Test de flujo manual end-to-end**

```bash
# 1. Registrar
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Mi Peluquería","email":"owner@test.cl","password":"password123"}'

# 2. Login (guardar token)
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.cl","password":"password123"}' | jq -r .access_token)

# 3. Crear servicio
curl -X POST http://localhost:8000/api/v1/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Corte de pelo","duration_minutes":30,"price":"15000"}'

# 4. Ver dashboard
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/dashboard/summary
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "chore: backend features complete — all tests passing"
```

---

## Siguiente paso

**Plan 3:** `2026-03-30-frontend.md` — Next.js 14, landing page, auth, dashboard, WhatsApp onboarding con Embedded Signup.
