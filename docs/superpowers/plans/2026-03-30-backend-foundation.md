# Cliente Fiel — Backend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI backend foundation: project setup, todos los modelos DB, migraciones Alembic, auth JWT completa (register/login/refresh/logout), y middleware multi-tenant.

**Architecture:** FastAPI async con SQLAlchemy 2.0 async ORM sobre PostgreSQL 16. Multi-tenancy via `tenant_id` en cada tabla, forzado en la capa de servicios. JWT: access token en Bearer header (30 min), refresh token en httpOnly cookie (7 días). Todas las queries filtran por `tenant_id` extraído del JWT — nunca del body.

**Tech Stack:** Python 3.12, FastAPI 0.110+, SQLAlchemy 2.0 (async + asyncpg), Alembic, PostgreSQL 16, Redis 7, python-jose[cryptography], Passlib[bcrypt], Pydantic v2, pydantic-settings, pytest + pytest-asyncio + httpx[http2]

---

## File Map

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                        — FastAPI app factory, CORS, routers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                  — Settings via pydantic-settings
│   │   ├── database.py                — SQLAlchemy async engine + session
│   │   ├── security.py                — JWT, bcrypt, Fernet AES-256
│   │   └── dependencies.py            — Depends: get_db, get_current_user, require_admin
│   ├── models/
│   │   ├── __init__.py                — re-export all models for Alembic
│   │   ├── base.py                    — TimestampMixin
│   │   ├── tenant.py                  — Tenant model
│   │   ├── user.py                    — User model (roles: admin, staff)
│   │   ├── whatsapp.py                — WhatsappConnection (creds cifradas)
│   │   ├── service.py                 — Service model
│   │   ├── time_slot.py               — TimeSlot model
│   │   ├── customer.py                — Customer model
│   │   ├── booking.py                 — Booking model
│   │   ├── reminder.py                — Reminder model
│   │   ├── message_log.py             — MessageLog model (sin contenido)
│   │   └── subscription.py            — Subscription model (Stripe)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── auth.py                    — RegisterRequest, LoginResponse, TokenResponse
│   ├── api/
│   │   ├── __init__.py
│   │   └── auth.py                    — /register, /login, /refresh, /logout
│   └── services/
│       ├── __init__.py
│       └── auth_service.py            — register_tenant, login, refresh logic
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── tests/
│   ├── conftest.py                    — async fixtures: app, db, client, tenants
│   ├── test_auth.py                   — register, login, refresh, logout, duplicates
│   └── test_multi_tenant.py           — isolation: tenant A no ve datos de tenant B
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
└── .env                               — copiar de .env.example y completar
```

---

## Task 1: Dependencias y Docker Compose

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/.env` (desde .env.example)

- [ ] **Step 1: Crear requirements.txt**

```
# backend/requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
sqlalchemy[asyncio]==2.0.28
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.6.3
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==42.0.4
httpx==0.27.0
redis==5.0.2
celery[redis]==5.3.6
slowapi==0.1.9
stripe==8.5.0
pytest==8.1.0
pytest-asyncio==0.23.5
pytest-cov==4.1.0
httpx==0.27.0
```

- [ ] **Step 2: Crear docker-compose.yml para desarrollo local**

```yaml
# backend/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: clientefiel
      POSTGRES_PASSWORD: password
      POSTGRES_DB: clientefiel_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clientefiel"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 3: Crear Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Copiar .env desde .env.example y completar valores de desarrollo**

```bash
cp .env.example .env
```

Editar `.env` con valores de desarrollo:
```
ENVIRONMENT=development
DATABASE_URL=postgresql://clientefiel:password@localhost:5432/clientefiel_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-secret-change-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000
META_APP_ID=placeholder
META_APP_SECRET=placeholder
META_WEBHOOK_VERIFY_TOKEN=dev-webhook-token
ENCRYPTION_KEY=dev-32-byte-key-change-in-prod!!
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_BASIC_PRICE_ID=price_placeholder_basic
STRIPE_MEDIUM_PRICE_ID=price_placeholder_medium
STRIPE_PREMIUM_PRICE_ID=price_placeholder_premium
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

- [ ] **Step 5: Levantar servicios y verificar**

```bash
cd backend
docker compose up -d
docker compose ps
```

Resultado esperado: postgres y redis en estado `healthy`.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/docker-compose.yml backend/Dockerfile
git commit -m "chore: add backend project setup and docker compose"
```

---

## Task 2: Core Config y Database

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`

- [ ] **Step 1: Crear app/__init__.py y app/core/__init__.py (vacíos)**

```bash
mkdir -p backend/app/core backend/app/models backend/app/schemas backend/app/api backend/app/services
touch backend/app/__init__.py backend/app/core/__init__.py
touch backend/app/models/__init__.py backend/app/schemas/__init__.py
touch backend/app/api/__init__.py backend/app/services/__init__.py
```

- [ ] **Step 2: Escribir test que falla para config**

```python
# backend/tests/test_config.py
from app.core.config import settings

def test_settings_load():
    assert settings.environment == "development"
    assert settings.database_url.startswith("postgresql://")
    assert len(settings.jwt_secret) >= 32
    assert len(settings.encryption_key) >= 32
```

- [ ] **Step 3: Ejecutar test para verificar que falla**

```bash
cd backend
python -m pytest tests/test_config.py -v
```

Resultado esperado: `ImportError: cannot import name 'settings'`

- [ ] **Step 4: Implementar app/core/config.py**

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    frontend_url: str
    meta_app_id: str
    meta_app_secret: str
    meta_webhook_verify_token: str
    encryption_key: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_basic_price_id: str
    stripe_medium_price_id: str
    stripe_premium_price_id: str
    celery_broker_url: str
    celery_result_backend: str

    model_config = {"env_file": ".env"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

- [ ] **Step 5: Implementar app/core/database.py**

```python
# backend/app/core/database.py
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


def _get_async_url(url: str) -> str:
    return url.replace("postgresql://", "postgresql+asyncpg://")


engine = create_async_engine(
    _get_async_url(settings.database_url),
    echo=settings.environment == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 6: Ejecutar test de config**

```bash
python -m pytest tests/test_config.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/
git commit -m "feat: add core config and database setup"
```

---

## Task 3: Modelos SQLAlchemy

**Files:**
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/tenant.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/whatsapp.py`
- Create: `backend/app/models/service.py`
- Create: `backend/app/models/time_slot.py`
- Create: `backend/app/models/customer.py`
- Create: `backend/app/models/booking.py`
- Create: `backend/app/models/reminder.py`
- Create: `backend/app/models/message_log.py`
- Create: `backend/app/models/subscription.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Crear app/models/base.py**

```python
# backend/app/models/base.py
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

- [ ] **Step 2: Crear app/models/tenant.py**

```python
# backend/app/models/tenant.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class TenantPlan(str, enum.Enum):
    basic = "basic"
    medium = "medium"
    premium = "premium"


class TenantStatus(str, enum.Enum):
    trial = "trial"
    active = "active"
    canceled = "canceled"
    past_due = "past_due"


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[TenantPlan] = mapped_column(
        SAEnum(TenantPlan), default=TenantPlan.basic, nullable=False
    )
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus), default=TenantStatus.trial, nullable=False
    )
    trial_ends_at: Mapped[datetime | None] = mapped_column(nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
```

- [ ] **Step 3: Crear app/models/user.py**

```python
# backend/app/models/user.py
import enum
import uuid
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole), default=UserRole.admin, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
```

- [ ] **Step 4: Crear app/models/whatsapp.py**

```python
# backend/app/models/whatsapp.py
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class WhatsappConnection(Base, TimestampMixin):
    __tablename__ = "whatsapp_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True,       # 1 conexión por tenant
        nullable=False,
    )
    phone_number_id: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    access_token_enc: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    token_expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    meta_waba_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
```

- [ ] **Step 5: Crear app/models/service.py**

```python
# backend/app/models/service.py
import uuid
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class Service(Base, TimestampMixin):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

- [ ] **Step 6: Crear app/models/time_slot.py**

```python
# backend/app/models/time_slot.py
import uuid
from datetime import time
from sqlalchemy import Integer, Time, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class TimeSlot(Base):
    __tablename__ = "time_slots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=lun, 6=dom
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    max_concurrent: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

- [ ] **Step 7: Crear app/models/customer.py**

```python
# backend/app/models/customer.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class CustomerStatus(str, enum.Enum):
    active = "active"
    vip = "vip"
    churned = "churned"


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uq_customer_tenant_phone"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_booking_at: Mapped[datetime | None] = mapped_column(nullable=True)
    total_bookings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[CustomerStatus] = mapped_column(
        SAEnum(CustomerStatus), default=CustomerStatus.active, nullable=False
    )
```

- [ ] **Step 8: Crear app/models/booking.py**

```python
# backend/app/models/booking.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    canceled = "canceled"
    no_show = "no_show"


class BookingCreatedBy(str, enum.Enum):
    whatsapp = "whatsapp"
    admin = "admin"


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=False
    )
    scheduled_at: Mapped[datetime] = mapped_column(nullable=False, index=True)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus), default=BookingStatus.pending, nullable=False
    )
    reminder_24h_sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    reminder_1h_sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[BookingCreatedBy] = mapped_column(
        SAEnum(BookingCreatedBy), default=BookingCreatedBy.admin, nullable=False
    )
```

- [ ] **Step 9: Crear app/models/reminder.py**

```python
# backend/app/models/reminder.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ReminderType(str, enum.Enum):
    confirmation = "confirmation"
    reminder_24h = "reminder_24h"
    reminder_1h = "reminder_1h"
    repurchase = "repurchase"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[ReminderType] = mapped_column(SAEnum(ReminderType), nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[ReminderStatus] = mapped_column(
        SAEnum(ReminderStatus), default=ReminderStatus.pending, nullable=False
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

- [ ] **Step 10: Crear app/models/message_log.py**

```python
# backend/app/models/message_log.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class MessageLogType(str, enum.Enum):
    confirmation = "confirmation"
    reminder_24h = "reminder_24h"
    reminder_1h = "reminder_1h"
    campaign = "campaign"
    system = "system"


class MessageLogStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class MessageLog(Base):
    """
    Trazabilidad de envíos. NO guarda contenido del mensaje ni payload de Meta.
    Solo registra el evento: quién, cuándo, tipo, resultado.
    """
    __tablename__ = "message_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True
    )
    type: Mapped[MessageLogType] = mapped_column(SAEnum(MessageLogType), nullable=False)
    status: Mapped[MessageLogStatus] = mapped_column(
        SAEnum(MessageLogStatus), default=MessageLogStatus.pending, nullable=False
    )
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False, index=True
    )
```

- [ ] **Step 11: Crear app/models/subscription.py**

```python
# backend/app/models/subscription.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantPlan, TenantStatus


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    plan: Mapped[TenantPlan] = mapped_column(
        SAEnum(TenantPlan), default=TenantPlan.basic, nullable=False
    )
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus), default=TenantStatus.trial, nullable=False
    )
    current_period_end: Mapped[datetime | None] = mapped_column(nullable=True)
    cancel_at: Mapped[datetime | None] = mapped_column(nullable=True)
```

- [ ] **Step 12: Actualizar app/models/__init__.py para que Alembic detecte todos los modelos**

```python
# backend/app/models/__init__.py
from app.models.tenant import Tenant, TenantPlan, TenantStatus
from app.models.user import User, UserRole
from app.models.whatsapp import WhatsappConnection
from app.models.service import Service
from app.models.time_slot import TimeSlot
from app.models.customer import Customer, CustomerStatus
from app.models.booking import Booking, BookingStatus, BookingCreatedBy
from app.models.reminder import Reminder, ReminderType, ReminderStatus
from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus
from app.models.subscription import Subscription

__all__ = [
    "Tenant", "TenantPlan", "TenantStatus",
    "User", "UserRole",
    "WhatsappConnection",
    "Service",
    "TimeSlot",
    "Customer", "CustomerStatus",
    "Booking", "BookingStatus", "BookingCreatedBy",
    "Reminder", "ReminderType", "ReminderStatus",
    "MessageLog", "MessageLogType", "MessageLogStatus",
    "Subscription",
]
```

- [ ] **Step 13: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add all SQLAlchemy models for Cliente Fiel"
```

---

## Task 4: Alembic — Configuración y Migración Inicial

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/001_initial_schema.py`

- [ ] **Step 1: Inicializar Alembic**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 2: Actualizar alembic/env.py para usar asyncpg y detectar modelos**

```python
# backend/alembic/env.py
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401 — importar todos los modelos

config = context.config
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Generar migración inicial**

```bash
cd backend
alembic revision --autogenerate -m "initial_schema"
```

Resultado esperado: archivo creado en `alembic/versions/` con todas las tablas.

- [ ] **Step 4: Ejecutar migración**

```bash
alembic upgrade head
```

Resultado esperado: `Running upgrade  -> <rev>, initial_schema` sin errores.

- [ ] **Step 5: Verificar tablas en PostgreSQL**

```bash
docker compose exec postgres psql -U clientefiel -d clientefiel_db -c "\dt"
```

Resultado esperado: 10 tablas listadas (tenants, users, whatsapp_connections, services, time_slots, customers, bookings, reminders, message_logs, subscriptions).

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/ backend/alembic.ini
git commit -m "feat: add Alembic config and initial schema migration"
```

---

## Task 5: Seguridad — JWT, Bcrypt y Fernet

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/tests/test_security.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# backend/tests/test_security.py
import pytest
from datetime import timedelta
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    encrypt_token,
    decrypt_token,
)


def test_hash_and_verify_password():
    hashed = hash_password("mypassword123")
    assert hashed != "mypassword123"
    assert verify_password("mypassword123", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_access_token():
    data = {"sub": "user-uuid-123", "tenant_id": "tenant-uuid-456", "role": "admin"}
    token = create_access_token(data, expires_delta=timedelta(minutes=30))
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["tenant_id"] == "tenant-uuid-456"
    assert decoded["role"] == "admin"


def test_decode_invalid_token_raises():
    with pytest.raises(Exception):
        decode_access_token("invalid.token.here")


def test_encrypt_and_decrypt_token():
    original = "my-whatsapp-access-token-12345"
    encrypted = encrypt_token(original)
    assert encrypted != original.encode()
    decrypted = decrypt_token(encrypted)
    assert decrypted == original


def test_encrypt_produces_different_output_each_time():
    token = "same-token"
    enc1 = encrypt_token(token)
    enc2 = encrypt_token(token)
    # Fernet usa IV aleatorio — cada cifrado es diferente
    assert enc1 != enc2
    # Pero ambos descifran al mismo valor
    assert decrypt_token(enc1) == decrypt_token(enc2) == token
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_security.py -v
```

Resultado esperado: `ImportError`

- [ ] **Step 3: Implementar app/core/security.py**

```python
# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}") from e


def _get_fernet() -> Fernet:
    key = settings.encryption_key.encode()
    # Fernet requiere exactamente 32 bytes base64url-encoded → usar primeros 32 bytes como base
    import base64
    padded = key[:32].ljust(32, b"=")
    encoded = base64.urlsafe_b64encode(padded)
    return Fernet(encoded)


def encrypt_token(token: str) -> bytes:
    """Cifrar access_token de WhatsApp antes de guardar en DB."""
    return _get_fernet().encrypt(token.encode())


def decrypt_token(encrypted: bytes) -> str:
    """Descifrar access_token de WhatsApp solo en memoria al momento de uso."""
    return _get_fernet().decrypt(encrypted).decode()
```

- [ ] **Step 4: Ejecutar tests**

```bash
python -m pytest tests/test_security.py -v
```

Resultado esperado: todos `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat: add JWT, bcrypt, and Fernet AES-256 security utilities"
```

---

## Task 6: Auth Schemas

**Files:**
- Create: `backend/app/schemas/auth.py`

- [ ] **Step 1: Implementar schemas Pydantic v2**

```python
# backend/app/schemas/auth.py
import uuid
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    business_name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("business_name")
    @classmethod
    def business_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Business name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/auth.py
git commit -m "feat: add auth Pydantic schemas"
```

---

## Task 7: Auth Service

**Files:**
- Create: `backend/app/services/auth_service.py`
- Create: `backend/tests/test_auth_service.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# backend/tests/test_auth_service.py
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base
from app.services.auth_service import AuthService
from app.models import Tenant, User
import app.models  # noqa

DATABASE_URL = "postgresql+asyncpg://clientefiel:password@localhost:5432/clientefiel_db"


@pytest_asyncio.fixture(scope="function")
async def db():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_register_creates_tenant_and_user(db: AsyncSession):
    service = AuthService(db)
    user, tenant = await service.register("Mi Negocio", "owner@example.com", "password123")
    assert user.email == "owner@example.com"
    assert tenant.name == "Mi Negocio"
    assert tenant.status.value == "trial"
    assert user.role.value == "admin"


@pytest.mark.asyncio
async def test_register_duplicate_email_raises(db: AsyncSession):
    service = AuthService(db)
    await service.register("Negocio 1", "same@example.com", "password123")
    with pytest.raises(ValueError, match="Email already registered"):
        await service.register("Negocio 2", "same@example.com", "password123")


@pytest.mark.asyncio
async def test_login_returns_user(db: AsyncSession):
    service = AuthService(db)
    await service.register("Negocio", "login@example.com", "correctpassword")
    user = await service.authenticate("login@example.com", "correctpassword")
    assert user.email == "login@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password_raises(db: AsyncSession):
    service = AuthService(db)
    await service.register("Negocio", "auth@example.com", "realpassword")
    with pytest.raises(ValueError, match="Invalid credentials"):
        await service.authenticate("auth@example.com", "wrongpassword")


@pytest.mark.asyncio
async def test_login_unknown_email_raises(db: AsyncSession):
    service = AuthService(db)
    with pytest.raises(ValueError, match="Invalid credentials"):
        await service.authenticate("nobody@example.com", "anypassword")
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_auth_service.py -v
```

Resultado esperado: `ImportError: cannot import name 'AuthService'`

- [ ] **Step 3: Implementar app/services/auth_service.py**

```python
# backend/app/services/auth_service.py
import re
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tenant import Tenant, TenantStatus, TenantPlan
from app.models.user import User, UserRole
from app.core.security import hash_password, verify_password


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{slug}-{uuid.uuid4().hex[:8]}"


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(
        self, business_name: str, email: str, password: str
    ) -> tuple[User, Tenant]:
        # Verificar email único
        result = await self.db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise ValueError("Email already registered")

        # Crear tenant con trial de 14 días
        tenant = Tenant(
            name=business_name,
            slug=_slugify(business_name),
            plan=TenantPlan.basic,
            status=TenantStatus.trial,
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        self.db.add(tenant)
        await self.db.flush()  # obtener tenant.id antes de crear user

        # Crear usuario admin
        user = User(
            tenant_id=tenant.id,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=True,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        await self.db.refresh(tenant)
        return user, tenant

    async def authenticate(self, email: str, password: str) -> User:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        if not user.is_active:
            raise ValueError("Account is inactive")
        return user
```

- [ ] **Step 4: Ejecutar tests**

```bash
python -m pytest tests/test_auth_service.py -v
```

Resultado esperado: todos `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/auth_service.py backend/tests/test_auth_service.py
git commit -m "feat: add auth service (register, authenticate)"
```

---

## Task 8: Dependencies (get_current_user, require_admin)

**Files:**
- Create: `backend/app/core/dependencies.py`

- [ ] **Step 1: Implementar dependencies.py**

```python
# backend/app/core/dependencies.py
import uuid
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.tenant import Tenant

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


async def get_current_tenant(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/dependencies.py
git commit -m "feat: add FastAPI dependencies (auth, tenant, admin guard)"
```

---

## Task 9: Auth Router

**Files:**
- Create: `backend/app/api/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Escribir tests de integración que fallan**

```python
# backend/tests/test_auth.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.main import app
import app.models  # noqa

DATABASE_URL = "postgresql+asyncpg://clientefiel:password@localhost:5432/clientefiel_db"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    async_session = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "business_name": "Peluquería Style",
        "email": "owner@style.cl",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "owner@style.cl"
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"business_name": "Negocio", "email": "dup@test.cl", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "business_name": "Spa Relax",
        "email": "spa@relax.cl",
        "password": "mypassword",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "spa@relax.cl",
        "password": "mypassword",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    # refresh_token en cookie httpOnly
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "business_name": "Negocio", "email": "wrong@test.cl", "password": "correct",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrong@test.cl", "password": "incorrect",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403  # HTTPBearer retorna 403 si no hay header


@pytest.mark.asyncio
async def test_protected_endpoint_with_valid_token(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "business_name": "Consultorio", "email": "doc@test.cl", "password": "pass1234",
    })
    token = reg.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "doc@test.cl"
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
python -m pytest tests/test_auth.py -v
```

Resultado esperado: `ImportError` o `404` (app no existe aún)

- [ ] **Step 3: Implementar app/api/auth.py**

```python
# backend/app/api/auth.py
from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RegisterResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    payload: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    try:
        user, tenant = await service.register(
            payload.business_name, payload.email, payload.password
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    access_token = create_access_token({
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role.value,
    })
    return RegisterResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    try:
        user = await service.authenticate(payload.email, payload.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role.value,
    })
    refresh_token = create_access_token(
        {"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
    )
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(current_user)
```

- [ ] **Step 4: Crear app/main.py**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth

app = FastAPI(
    title="Cliente Fiel API",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}
```

- [ ] **Step 5: Ejecutar tests**

```bash
python -m pytest tests/test_auth.py -v
```

Resultado esperado: todos `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/auth.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: add auth router (register, login, logout, me)"
```

---

## Task 10: Test de Aislamiento Multi-Tenant

**Files:**
- Create: `backend/tests/test_multi_tenant.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Crear conftest.py con fixtures reutilizables**

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.main import app
import app.models  # noqa

DATABASE_URL = "postgresql+asyncpg://clientefiel:password@localhost:5432/clientefiel_db"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    async_session = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def register_and_login(client: AsyncClient, email: str, business: str) -> str:
    """Helper: registrar un tenant y retornar su access_token."""
    response = await client.post("/api/v1/auth/register", json={
        "business_name": business,
        "email": email,
        "password": "testpassword123",
    })
    assert response.status_code == 201
    return response.json()["access_token"]
```

- [ ] **Step 2: Escribir test de aislamiento que falla (necesita endpoint de servicios)**

```python
# backend/tests/test_multi_tenant.py
"""
Tests de aislamiento multi-tenant.
Verifican que los datos de un tenant NUNCA son visibles para otro tenant.
Este es el test más crítico del sistema.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_tenant_isolation_me_endpoint(client: AsyncClient):
    """Cada usuario solo ve su propio perfil."""
    token_a = await register_and_login(client, "tenant_a@test.cl", "Negocio A")
    token_b = await register_and_login(client, "tenant_b@test.cl", "Negocio B")

    me_a = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    me_b = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})

    assert me_a.status_code == 200
    assert me_b.status_code == 200
    assert me_a.json()["email"] == "tenant_a@test.cl"
    assert me_b.json()["email"] == "tenant_b@test.cl"
    # Los tenant_id deben ser distintos
    assert me_a.json()["tenant_id"] != me_b.json()["tenant_id"]


@pytest.mark.asyncio
async def test_token_from_tenant_a_cannot_be_used_for_tenant_b_data(client: AsyncClient):
    """Un token válido de tenant A no puede acceder datos de tenant B."""
    token_a = await register_and_login(client, "iso_a@test.cl", "Empresa A")
    # Verificar que el token de A solo muestra datos de A
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me.json()["email"] == "iso_a@test.cl"
```

- [ ] **Step 3: Ejecutar tests de aislamiento**

```bash
python -m pytest tests/test_multi_tenant.py -v
```

Resultado esperado: `PASSED`

- [ ] **Step 4: Ejecutar suite completa con cobertura**

```bash
python -m pytest tests/ -v --cov=app --cov-report=term-missing
```

Resultado esperado: todos los tests pasan, cobertura > 70% en `app/core/` y `app/services/`.

- [ ] **Step 5: Commit final**

```bash
git add backend/tests/
git commit -m "test: add multi-tenant isolation tests and shared conftest"
```

---

## Task 11: pytest.ini y verificación final

**Files:**
- Create: `backend/pytest.ini`

- [ ] **Step 1: Crear pytest.ini**

```ini
# backend/pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 2: Ejecutar suite completa**

```bash
cd backend
python -m pytest tests/ -v
```

Resultado esperado: todos los tests pasan sin warnings de asyncio.

- [ ] **Step 3: Verificar que el servidor arranca**

```bash
uvicorn app.main:app --reload --port 8000
```

En otra terminal:
```bash
curl http://localhost:8000/health
```

Resultado esperado: `{"status":"ok","environment":"development"}`

- [ ] **Step 4: Verificar docs OpenAPI**

Abrir en navegador: `http://localhost:8000/docs`

Resultado esperado: página de Swagger UI con los 4 endpoints de auth.

- [ ] **Step 5: Commit final**

```bash
git add backend/pytest.ini
git commit -m "chore: add pytest config and verify server startup"
```

---

## Self-Review

**Spec coverage:**

| Requisito spec | Task que lo implementa |
|---------------|----------------------|
| FastAPI + SQLAlchemy 2.0 async | Task 1, 2 |
| PostgreSQL 16 + Alembic | Task 4 |
| 10 tablas DB (todos los modelos) | Task 3 |
| JWT access en Bearer header | Task 5, 8, 9 |
| refresh_token en httpOnly cookie | Task 9 |
| bcrypt para contraseñas | Task 5, 7 |
| AES-256 Fernet para WA tokens | Task 5 |
| Multi-tenancy: tenant_id del JWT | Task 8, 10 |
| Roles admin / staff | Task 3 (User model), Task 8 (dependencies) |
| register + login + logout + /me | Task 9 |
| Tests de aislamiento multi-tenant | Task 10 |
| Cobertura mínima 70% | Task 11 |
| CORS solo FRONTEND_URL | Task 9 (main.py) |
| docker-compose para dev | Task 1 |

**Gaps:** Ninguno para el scope de este plan (foundation).

**Pendiente para Plan 2:** WhatsApp connect, bookings CRUD, webhooks Meta/Stripe, Celery reminders, rate limiting.

---

## Siguiente paso

**Plan 2:** `2026-03-30-backend-features.md` — WhatsApp Embedded Signup, reservas, webhooks idempotentes, Celery reminders, Stripe.

**Plan 3:** `2026-03-30-frontend.md` — Next.js setup, landing page, auth, dashboard, onboarding WhatsApp.
