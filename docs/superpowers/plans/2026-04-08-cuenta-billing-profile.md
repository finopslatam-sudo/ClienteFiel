# Cuenta Page + BillingProfile + Registration Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add name fields to registration, persist billing document preferences per tenant, and build a /cuenta page showing account + billing data.

**Architecture:** New `BillingProfile` model (1-to-1 with Tenant) holds boleta/factura preference. `User` model gains `first_name`/`last_name`. A new `/account` API router handles account data. A `DocumentPreferenceModal` appears after every MP payment. `/cuenta` dashboard page shows both sections.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Alembic (backend); Next.js 14 App Router + React Hook Form + Zod (frontend); pytest-asyncio for tests.

---

## File Map

**Create:**
- `backend/app/models/billing_profile.py` — BillingProfile model + DocumentType enum
- `backend/app/schemas/account.py` — AccountResponse, AccountUpdateRequest
- `backend/app/schemas/billing_profile.py` — BillingProfileResponse, BillingProfileRequest
- `backend/app/api/account.py` — GET/PUT /account/me router
- `backend/tests/test_account.py` — account endpoint tests
- `backend/tests/test_billing_profile.py` — billing profile endpoint + service tests
- `frontend/components/billing/DocumentPreferenceModal.tsx` — modal component
- `frontend/app/(dashboard)/cuenta/page.tsx` — account dashboard page

**Modify:**
- `backend/app/models/user.py` — add first_name, last_name
- `backend/app/models/__init__.py` — export BillingProfile
- `backend/app/schemas/auth.py` — add first_name, last_name to RegisterRequest/UserResponse
- `backend/app/services/auth_service.py` — pass first_name, last_name to User creation
- `backend/app/services/billing_service.py` — add get_billing_profile, _upsert_billing_profile
- `backend/app/api/billing.py` — add GET/PUT /billing/profile endpoints
- `backend/app/main.py` — include account router
- `backend/tests/conftest.py` — update register_and_login helper
- `frontend/lib/auth.ts` — add first_name, last_name to RegisterPayload
- `frontend/app/(auth)/registro/page.tsx` — add 3 new form fields
- `frontend/app/(dashboard)/suscripcion/page.tsx` — change back_url, add modal trigger
- `frontend/components/dashboard/Sidebar.tsx` — add /cuenta nav item

---

## Task 1: User model + BillingProfile model

**Files:**
- Modify: `backend/app/models/user.py`
- Create: `backend/app/models/billing_profile.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Add first_name and last_name to User model**

Replace the content of `backend/app/models/user.py`:

```python
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
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole), default=UserRole.admin, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")  # noqa: F821
```

- [ ] **Step 2: Create BillingProfile model**

Create `backend/app/models/billing_profile.py`:

```python
import enum
import uuid
from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import TimestampMixin


class DocumentType(str, enum.Enum):
    boleta = "boleta"
    factura = "factura"


class BillingProfile(Base, TimestampMixin):
    __tablename__ = "billing_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType), nullable=False
    )
    person_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    person_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    person_rut: Mapped[str] = mapped_column(String(20), nullable=False)
    person_email: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_razon_social: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_rut: Mapped[str | None] = mapped_column(String(20), nullable=True)
    company_giro: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

- [ ] **Step 3: Export BillingProfile from models __init__**

In `backend/app/models/__init__.py`, add the import and __all__ entry:

```python
from app.models.tenant import Tenant, TenantPlan, TenantStatus
from app.models.user import User, UserRole
from app.models.whatsapp import WhatsappConnection
from app.models.service import Service
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.customer import Customer, CustomerStatus
from app.models.booking import Booking, BookingStatus, BookingCreatedBy
from app.models.reminder import Reminder, ReminderType, ReminderStatus
from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus
from app.models.subscription import Subscription
from app.models.billing_profile import BillingProfile, DocumentType

__all__ = [
    "Tenant", "TenantPlan", "TenantStatus",
    "User", "UserRole",
    "WhatsappConnection",
    "Service",
    "AvailabilityRule", "AvailabilityOverride",
    "Customer", "CustomerStatus",
    "Booking", "BookingStatus", "BookingCreatedBy",
    "Reminder", "ReminderType", "ReminderStatus",
    "MessageLog", "MessageLogType", "MessageLogStatus",
    "Subscription",
    "BillingProfile", "DocumentType",
]
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py backend/app/models/billing_profile.py backend/app/models/__init__.py
git commit -m "feat: add first_name/last_name to User and create BillingProfile model"
```

---

## Task 2: Alembic migration

**Files:**
- Create: `backend/alembic/versions/<generated_hash>_add_user_name_and_billing_profile.py`

- [ ] **Step 1: Generate migration file**

```bash
cd backend
alembic revision -m "add_user_name_and_billing_profile"
```

This creates a file at `backend/alembic/versions/<hash>_add_user_name_and_billing_profile.py`. Open it.

- [ ] **Step 2: Fill in upgrade() and downgrade()**

Set `down_revision` to `'e5a3c2b1d9f7'`. Replace the empty `upgrade` and `downgrade` functions:

```python
def upgrade() -> None:
    # Add name columns to users
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))

    # Create billing_profiles table
    op.create_table(
        "billing_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("document_type", sa.Enum("boleta", "factura", name="documenttype"), nullable=False),
        sa.Column("person_first_name", sa.String(100), nullable=False),
        sa.Column("person_last_name", sa.String(100), nullable=False),
        sa.Column("person_rut", sa.String(20), nullable=False),
        sa.Column("person_email", sa.String(255), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("company_razon_social", sa.String(255), nullable=True),
        sa.Column("company_rut", sa.String(20), nullable=True),
        sa.Column("company_giro", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_billing_profiles_tenant_id", "billing_profiles", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_billing_profiles_tenant_id", table_name="billing_profiles")
    op.drop_table("billing_profiles")
    op.execute("DROP TYPE IF EXISTS documenttype")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
```

Make sure the imports at the top of the migration file include:

```python
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
```

- [ ] **Step 3: Apply migration locally**

```bash
cd backend
alembic upgrade head
```

Expected output ends with: `Running upgrade e5a3c2b1d9f7 -> <your_hash>, add_user_name_and_billing_profile`

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: migration for user name fields and billing_profiles table"
```

---

## Task 3: Auth schema + service for new registration fields

**Files:**
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/services/auth_service.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Update RegisterRequest and UserResponse in auth.py**

Replace `backend/app/schemas/auth.py`:

```python
import uuid
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
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

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name fields cannot be empty")
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
    first_name: str | None
    last_name: str | None

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 2: Update AuthService.register() to persist first_name and last_name**

In `backend/app/services/auth_service.py`, update the `register` method signature and User creation:

```python
async def register(
    self, business_name: str, email: str, password: str,
    first_name: str = "", last_name: str = "",
) -> tuple[User, Tenant]:
    result = await self.db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ValueError("Email already registered")

    tenant = Tenant(
        name=business_name,
        slug=_slugify(business_name),
        plan=TenantPlan.basic,
        status=TenantStatus.trial,
        trial_ends_at=(datetime.now(timezone.utc) + timedelta(days=14)).replace(tzinfo=None),
    )
    self.db.add(tenant)
    await self.db.flush()

    user = User(
        tenant_id=tenant.id,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.admin,
        is_active=True,
        first_name=first_name,
        last_name=last_name,
    )
    self.db.add(user)
    await self.db.commit()
    await self.db.refresh(user)
    await self.db.refresh(tenant)
    return user, tenant
```

- [ ] **Step 3: Update auth.py router to pass new fields**

In `backend/app/api/auth.py`, update the `register` endpoint call:

```python
user, tenant = await service.register(
    payload.business_name, payload.email, payload.password,
    first_name=payload.first_name, last_name=payload.last_name,
)
```

- [ ] **Step 4: Update conftest.py register_and_login helper**

In `backend/tests/conftest.py`, update `register_and_login`:

```python
async def register_and_login(client: AsyncClient, email: str, business: str) -> str:
    """Helper: registrar un tenant y retornar su access_token."""
    response = await client.post("/api/v1/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "business_name": business,
        "email": email,
        "password": "testpassword123",
    })
    assert response.status_code == 201
    return response.json()["access_token"]
```

- [ ] **Step 5: Run existing tests to confirm nothing broke**

```bash
cd backend
pytest tests/ -v --tb=short
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/services/auth_service.py backend/app/api/auth.py backend/tests/conftest.py
git commit -m "feat: add first_name and last_name to registration flow"
```

---

## Task 4: Account API (GET/PUT /account/me)

**Files:**
- Create: `backend/app/schemas/account.py`
- Create: `backend/app/api/account.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_account.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_account.py`:

```python
import pytest
from httpx import AsyncClient
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_get_account_returns_user_data(client: AsyncClient):
    token = await register_and_login(client, "account_get@test.cl", "Mi Negocio")
    resp = await client.get(
        "/api/v1/account/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert data["email"] == "account_get@test.cl"
    assert data["company_name"] == "Mi Negocio"


@pytest.mark.asyncio
async def test_update_account_success(client: AsyncClient):
    token = await register_and_login(client, "account_put@test.cl", "Negocio Viejo")
    resp = await client.put(
        "/api/v1/account/me",
        json={"first_name": "Richard", "last_name": "Chamorro", "company_name": "Riava SpA"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Richard"
    assert data["last_name"] == "Chamorro"
    assert data["company_name"] == "Riava SpA"


@pytest.mark.asyncio
async def test_update_account_persists(client: AsyncClient):
    token = await register_and_login(client, "account_persist@test.cl", "Temporal")
    await client.put(
        "/api/v1/account/me",
        json={"first_name": "Ana", "last_name": "Pérez", "company_name": "Ana Ltda"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/v1/account/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.json()["company_name"] == "Ana Ltda"


@pytest.mark.asyncio
async def test_account_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/account/me")
    assert resp.status_code == 403
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_account.py -v
```

Expected: FAILED (404 or connection error — endpoint doesn't exist yet).

- [ ] **Step 3: Create account schemas**

Create `backend/app/schemas/account.py`:

```python
from pydantic import BaseModel


class AccountResponse(BaseModel):
    first_name: str | None
    last_name: str | None
    email: str
    company_name: str


class AccountUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    company_name: str
```

- [ ] **Step 4: Create account router**

Create `backend/app/api/account.py`:

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_tenant
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.account import AccountResponse, AccountUpdateRequest

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=AccountResponse)
async def get_account(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
):
    return AccountResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        company_name=current_tenant.name,
    )


@router.put("/me", response_model=AccountResponse)
async def update_account(
    payload: AccountUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    current_user.first_name = payload.first_name
    current_user.last_name = payload.last_name
    current_tenant.name = payload.company_name
    await db.commit()
    return AccountResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        company_name=current_tenant.name,
    )
```

- [ ] **Step 5: Register account router in main.py**

In `backend/app/main.py`, add after the billing import:

```python
from app.api import account as account_router
```

And after `app.include_router(billing_router.router, prefix="/api/v1")`:

```python
app.include_router(account_router.router, prefix="/api/v1")
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
pytest tests/test_account.py -v
```

Expected: 4 PASSED.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/account.py backend/app/api/account.py backend/app/main.py backend/tests/test_account.py
git commit -m "feat: add GET/PUT /account/me endpoints"
```

---

## Task 5: BillingProfile API (GET/PUT /billing/profile)

**Files:**
- Create: `backend/app/schemas/billing_profile.py`
- Modify: `backend/app/services/billing_service.py`
- Modify: `backend/app/api/billing.py`
- Create: `backend/tests/test_billing_profile.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_billing_profile.py`:

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.conftest import register_and_login
from app.services.billing_service import BillingService
from app.models.billing_profile import DocumentType


BOLETA_PAYLOAD = {
    "document_type": "boleta",
    "person_first_name": "Richard",
    "person_last_name": "Chamorro",
    "person_rut": "12.345.678-9",
    "person_email": "richard@test.cl",
}

FACTURA_PAYLOAD = {
    "document_type": "factura",
    "person_first_name": "Richard",
    "person_last_name": "Chamorro",
    "person_rut": "12.345.678-9",
    "person_email": "richard@test.cl",
    "company_name": "Riava SpA",
    "company_razon_social": "Riava Servicios SpA",
    "company_rut": "76.543.210-K",
    "company_giro": "Desarrollo de Software",
}


@pytest.mark.asyncio
async def test_get_billing_profile_returns_null_when_missing(client: AsyncClient):
    token = await register_and_login(client, "bp_get@test.cl", "Negocio BP")
    resp = await client.get(
        "/api/v1/billing/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_upsert_billing_profile_boleta(client: AsyncClient):
    token = await register_and_login(client, "bp_boleta@test.cl", "Negocio Boleta")
    resp = await client.put(
        "/api/v1/billing/profile",
        json=BOLETA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document_type"] == "boleta"
    assert data["person_first_name"] == "Richard"
    assert data["company_name"] is None


@pytest.mark.asyncio
async def test_upsert_billing_profile_factura(client: AsyncClient):
    token = await register_and_login(client, "bp_factura@test.cl", "Negocio Factura")
    resp = await client.put(
        "/api/v1/billing/profile",
        json=FACTURA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document_type"] == "factura"
    assert data["company_name"] == "Riava SpA"
    assert data["company_giro"] == "Desarrollo de Software"


@pytest.mark.asyncio
async def test_upsert_billing_profile_factura_missing_company_returns_422(client: AsyncClient):
    token = await register_and_login(client, "bp_422@test.cl", "Negocio 422")
    incomplete = {**BOLETA_PAYLOAD, "document_type": "factura"}  # factura but no company fields
    resp = await client.put(
        "/api/v1/billing/profile",
        json=incomplete,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upsert_billing_profile_updates_existing(client: AsyncClient):
    token = await register_and_login(client, "bp_update@test.cl", "Negocio Update")
    await client.put(
        "/api/v1/billing/profile",
        json=BOLETA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    updated = {**BOLETA_PAYLOAD, "person_first_name": "Ana"}
    resp = await client.put(
        "/api/v1/billing/profile",
        json=updated,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["person_first_name"] == "Ana"


@pytest.mark.asyncio
async def test_get_billing_profile_returns_saved_data(client: AsyncClient):
    token = await register_and_login(client, "bp_read@test.cl", "Negocio Read")
    await client.put(
        "/api/v1/billing/profile",
        json=FACTURA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/v1/billing/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["document_type"] == "factura"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_billing_profile.py -v
```

Expected: FAILED (endpoints don't exist yet).

- [ ] **Step 3: Create billing profile schemas**

Create `backend/app/schemas/billing_profile.py`:

```python
from pydantic import BaseModel, EmailStr, model_validator
from app.models.billing_profile import DocumentType


class BillingProfileResponse(BaseModel):
    document_type: str
    person_first_name: str
    person_last_name: str
    person_rut: str
    person_email: str
    company_name: str | None
    company_razon_social: str | None
    company_rut: str | None
    company_giro: str | None

    model_config = {"from_attributes": True}


class BillingProfileRequest(BaseModel):
    document_type: DocumentType
    person_first_name: str
    person_last_name: str
    person_rut: str
    person_email: EmailStr
    company_name: str | None = None
    company_razon_social: str | None = None
    company_rut: str | None = None
    company_giro: str | None = None

    @model_validator(mode="after")
    def company_fields_required_for_factura(self) -> "BillingProfileRequest":
        if self.document_type == DocumentType.factura:
            missing = [
                f for f in ("company_name", "company_razon_social", "company_rut", "company_giro")
                if not getattr(self, f)
            ]
            if missing:
                raise ValueError(f"Required for factura: {', '.join(missing)}")
        return self
```

- [ ] **Step 4: Add billing profile methods to BillingService**

In `backend/app/services/billing_service.py`, add at the top of imports:

```python
from app.models.billing_profile import BillingProfile, DocumentType
```

Then add these two methods to the `BillingService` class (after `cancel_subscription`):

```python
async def get_billing_profile(self, tenant_id: uuid.UUID) -> BillingProfile | None:
    result = await self.db.execute(
        select(BillingProfile).where(BillingProfile.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()

async def _upsert_billing_profile(
    self,
    tenant_id: uuid.UUID,
    document_type: DocumentType,
    person_first_name: str,
    person_last_name: str,
    person_rut: str,
    person_email: str,
    company_name: str | None,
    company_razon_social: str | None,
    company_rut: str | None,
    company_giro: str | None,
) -> BillingProfile:
    result = await self.db.execute(
        select(BillingProfile).where(BillingProfile.tenant_id == tenant_id)
    )
    profile = result.scalar_one_or_none()

    if profile:
        profile.document_type = document_type
        profile.person_first_name = person_first_name
        profile.person_last_name = person_last_name
        profile.person_rut = person_rut
        profile.person_email = person_email
        profile.company_name = company_name
        profile.company_razon_social = company_razon_social
        profile.company_rut = company_rut
        profile.company_giro = company_giro
    else:
        profile = BillingProfile(
            tenant_id=tenant_id,
            document_type=document_type,
            person_first_name=person_first_name,
            person_last_name=person_last_name,
            person_rut=person_rut,
            person_email=person_email,
            company_name=company_name,
            company_razon_social=company_razon_social,
            company_rut=company_rut,
            company_giro=company_giro,
        )
        self.db.add(profile)

    await self.db.commit()
    return profile
```

- [ ] **Step 5: Add GET/PUT /billing/profile endpoints to billing.py**

In `backend/app/api/billing.py`, add the imports at the top:

```python
from app.schemas.billing_profile import BillingProfileResponse, BillingProfileRequest
```

Then add these two endpoints at the end of the file:

```python
@router.get("/profile", response_model=BillingProfileResponse | None)
async def get_billing_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retorna el perfil de facturación del tenant actual."""
    service = BillingService(db)
    return await service.get_billing_profile(current_tenant.id)


@router.put("/profile", response_model=BillingProfileResponse)
async def upsert_billing_profile(
    payload: BillingProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Crea o actualiza el perfil de facturación del tenant."""
    service = BillingService(db)
    return await service._upsert_billing_profile(
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
```

- [ ] **Step 6: Run all billing profile tests**

```bash
cd backend
pytest tests/test_billing_profile.py -v
```

Expected: 6 PASSED.

- [ ] **Step 7: Run full test suite to check coverage**

```bash
cd backend
pytest --cov=app --cov-report=term-missing --cov-fail-under=70 -v
```

Expected: all tests pass, coverage ≥ 70%.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/billing_profile.py backend/app/services/billing_service.py backend/app/api/billing.py backend/tests/test_billing_profile.py
git commit -m "feat: add BillingProfile service methods and GET/PUT /billing/profile endpoints"
```

---

## Task 6: Frontend — registration form

**Files:**
- Modify: `frontend/lib/auth.ts`
- Modify: `frontend/app/(auth)/registro/page.tsx`

- [ ] **Step 1: Update RegisterPayload in auth.ts**

In `frontend/lib/auth.ts`, update the `RegisterPayload` interface and `register` function:

```typescript
interface RegisterPayload {
  first_name: string
  last_name: string
  business_name: string
  email: string
  password: string
}
```

The rest of `auth.ts` stays the same — the function already sends the full payload to the API.

- [ ] **Step 2: Update registro/page.tsx with new fields**

Replace `frontend/app/(auth)/registro/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { register as registerUser } from '@/lib/auth'
import { fadeInUp } from '@/lib/motion'

const schema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  business_name: z.string().min(2, 'Nombre del negocio requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await registerUser(data)
      router.push('/onboarding')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Error al crear la cuenta. Intenta nuevamente.')
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="glass-card p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Crear tu cuenta gratis
      </h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>14 días gratis · Sin tarjeta de crédito</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
              Nombre
            </label>
            <input
              {...register('first_name')}
              placeholder="Richard"
              className="input-dark w-full px-3 py-2 text-sm"
            />
            {errors.first_name && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
              Apellido
            </label>
            <input
              {...register('last_name')}
              placeholder="Chamorro"
              className="input-dark w-full px-3 py-2 text-sm"
            />
            {errors.last_name && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Nombre del negocio
          </label>
          <input
            {...register('business_name')}
            placeholder="Peluquería Style"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.business_name && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.business_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@negocio.cl"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Contraseña
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-cyan w-full py-3 rounded-lg text-sm"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>

        <p className="text-center text-xs" style={{ color: '#475569' }}>
          Sin tarjeta hasta el día 14 · Cancela cuando quieras
        </p>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#94a3b8' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: '#06b6d4' }}>
          Iniciar sesión
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/auth.ts frontend/app/'(auth)'/registro/page.tsx
git commit -m "feat: add first_name, last_name, business_name fields to registration form"
```

---

## Task 7: DocumentPreferenceModal + suscripcion page changes

**Files:**
- Create: `frontend/components/billing/DocumentPreferenceModal.tsx`
- Modify: `frontend/app/(dashboard)/suscripcion/page.tsx`

- [ ] **Step 1: Create DocumentPreferenceModal component**

Create `frontend/components/billing/DocumentPreferenceModal.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'

const baseSchema = z.object({
  document_type: z.enum(['boleta', 'factura']),
  person_first_name: z.string().min(1, 'Requerido'),
  person_last_name: z.string().min(1, 'Requerido'),
  person_rut: z.string().min(1, 'Requerido'),
  person_email: z.string().email('Email inválido'),
  company_name: z.string().optional(),
  company_razon_social: z.string().optional(),
  company_rut: z.string().optional(),
  company_giro: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.document_type === 'factura') {
    const companyFields = ['company_name', 'company_razon_social', 'company_rut', 'company_giro'] as const
    for (const field of companyFields) {
      if (!data[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido', path: [field] })
      }
    }
  }
})

type FormData = z.infer<typeof baseSchema>

interface BillingProfileData {
  document_type: 'boleta' | 'factura'
  person_first_name: string
  person_last_name: string
  person_rut: string
  person_email: string
  company_name: string | null
  company_razon_social: string | null
  company_rut: string | null
  company_giro: string | null
}

interface Props {
  onClose: () => void
}

export function DocumentPreferenceModal({ onClose }: Props) {
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: { document_type: 'boleta' },
  })

  const documentType = watch('document_type')

  useEffect(() => {
    api.get<BillingProfileData | null>('/api/v1/billing/profile').then(({ data }) => {
      if (data) {
        reset({
          document_type: data.document_type,
          person_first_name: data.person_first_name,
          person_last_name: data.person_last_name,
          person_rut: data.person_rut,
          person_email: data.person_email,
          company_name: data.company_name ?? '',
          company_razon_social: data.company_razon_social ?? '',
          company_rut: data.company_rut ?? '',
          company_giro: data.company_giro ?? '',
        })
      }
    }).catch(() => {})
  }, [reset])

  const onSubmit = async (data: FormData) => {
    setSubmitError('')
    try {
      await api.put('/api/v1/billing/profile', data)
      onClose()
    } catch {
      setSubmitError('Error al guardar. Intenta nuevamente.')
    }
  }

  const inputClass = 'input-dark w-full px-3 py-2 text-sm'
  const labelClass = 'block text-sm font-medium mb-1'
  const errorClass = 'text-xs mt-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        style={{ border: '1px solid rgba(6,182,212,0.2)' }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: '#f1f5f9' }}>
          Datos de facturación
        </h2>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
          ¿Cómo prefieres recibir tu comprobante de pago?
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo documento */}
          <div className="flex gap-4">
            {(['boleta', 'factura'] as const).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer text-sm capitalize"
                style={{ color: documentType === type ? '#06b6d4' : '#94a3b8' }}
              >
                <input
                  type="radio"
                  value={type}
                  {...register('document_type')}
                  className="accent-cyan-400"
                />
                {type}
              </label>
            ))}
          </div>

          {/* Campos personales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
              <input {...register('person_first_name')} className={inputClass} />
              {errors.person_first_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_first_name.message}</p>}
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
              <input {...register('person_last_name')} className={inputClass} />
              {errors.person_last_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_last_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>RUT</label>
              <input {...register('person_rut')} placeholder="12.345.678-9" className={inputClass} />
              {errors.person_rut && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_rut.message}</p>}
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Email</label>
              <input {...register('person_email')} type="email" className={inputClass} />
              {errors.person_email && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_email.message}</p>}
            </div>
          </div>

          {/* Campos empresa — solo si factura */}
          {documentType === 'factura' && (
            <>
              <div
                className="pt-3 mt-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#64748b', borderTop: '1px solid rgba(6,182,212,0.1)' }}
              >
                Datos empresa
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre empresa</label>
                <input {...register('company_name')} className={inputClass} />
                {errors.company_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Razón Social</label>
                <input {...register('company_razon_social')} className={inputClass} />
                {errors.company_razon_social && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_razon_social.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>RUT empresa</label>
                  <input {...register('company_rut')} placeholder="76.543.210-K" className={inputClass} />
                  {errors.company_rut && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_rut.message}</p>}
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Giro</label>
                  <input {...register('company_giro')} placeholder="Desarrollo de Software" className={inputClass} />
                  {errors.company_giro && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_giro.message}</p>}
                </div>
              </div>
            </>
          )}

          {submitError && (
            <p className="text-sm" style={{ color: '#f87171' }}>{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-cyan w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update suscripcion/page.tsx**

In `frontend/app/(dashboard)/suscripcion/page.tsx`, make these changes:

Add imports at the top (after existing imports):
```tsx
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { DocumentPreferenceModal } from '@/components/billing/DocumentPreferenceModal'
```

Inside `SuscripcionPage`, add state and hooks:
```tsx
const router = useRouter()
const searchParams = useSearchParams()
const [showModal, setShowModal] = useState(false)

useEffect(() => {
  if (searchParams.get('subscribed') === 'true') {
    setShowModal(true)
  }
}, [searchParams])

const handleModalClose = () => {
  setShowModal(false)
  router.replace('/suscripcion')
}
```

Change `back_url` in `handleSubscribe`:
```tsx
const backUrl = `${window.location.origin}/suscripcion?subscribed=true`
```

Add modal just before the closing `</div>` of the return:
```tsx
{showModal && <DocumentPreferenceModal onClose={handleModalClose} />}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/billing/DocumentPreferenceModal.tsx frontend/app/'(dashboard)'/suscripcion/page.tsx
git commit -m "feat: add DocumentPreferenceModal triggered after MP payment"
```

---

## Task 8: /cuenta page + sidebar

**Files:**
- Create: `frontend/app/(dashboard)/cuenta/page.tsx`
- Modify: `frontend/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Create /cuenta page**

Create `frontend/app/(dashboard)/cuenta/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'

// --- Account section ---
const accountSchema = z.object({
  first_name: z.string().min(1, 'Requerido'),
  last_name: z.string().min(1, 'Requerido'),
  company_name: z.string().min(1, 'Requerido'),
})
type AccountForm = z.infer<typeof accountSchema>

interface AccountData {
  first_name: string | null
  last_name: string | null
  email: string
  company_name: string
}

// --- Billing profile section ---
const billingSchema = z.object({
  document_type: z.enum(['boleta', 'factura']),
  person_first_name: z.string().min(1, 'Requerido'),
  person_last_name: z.string().min(1, 'Requerido'),
  person_rut: z.string().min(1, 'Requerido'),
  person_email: z.string().email('Email inválido'),
  company_name: z.string().optional(),
  company_razon_social: z.string().optional(),
  company_rut: z.string().optional(),
  company_giro: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.document_type === 'factura') {
    const fields = ['company_name', 'company_razon_social', 'company_rut', 'company_giro'] as const
    for (const f of fields) {
      if (!data[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido', path: [f] })
    }
  }
})
type BillingForm = z.infer<typeof billingSchema>

interface BillingProfileData {
  document_type: 'boleta' | 'factura'
  person_first_name: string
  person_last_name: string
  person_rut: string
  person_email: string
  company_name: string | null
  company_razon_social: string | null
  company_rut: string | null
  company_giro: string | null
}

const inputClass = 'input-dark w-full px-3 py-2 text-sm'
const labelClass = 'block text-sm font-medium mb-1'
const errorClass = 'text-xs mt-1'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#f1f5f9' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function CuentaPage() {
  // Account
  const [account, setAccount] = useState<AccountData | null>(null)
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')

  const accountForm = useForm<AccountForm>({ resolver: zodResolver(accountSchema) })

  useEffect(() => {
    api.get<AccountData>('/api/v1/account/me').then(({ data }) => {
      setAccount(data)
      accountForm.reset({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        company_name: data.company_name,
      })
    }).catch(() => {})
  }, [accountForm])

  const saveAccount = async (data: AccountForm) => {
    setAccountSaving(true)
    setAccountError('')
    try {
      const { data: updated } = await api.put<AccountData>('/api/v1/account/me', data)
      setAccount(updated)
      setEditingAccount(false)
    } catch {
      setAccountError('Error al guardar. Intenta nuevamente.')
    } finally {
      setAccountSaving(false)
    }
  }

  // Billing profile
  const [billingProfile, setBillingProfile] = useState<BillingProfileData | null>(null)
  const [editingBilling, setEditingBilling] = useState(false)
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingError, setBillingError] = useState('')

  const billingForm = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: { document_type: 'boleta' },
  })
  const billingDocType = billingForm.watch('document_type')

  useEffect(() => {
    api.get<BillingProfileData | null>('/api/v1/billing/profile').then(({ data }) => {
      if (data) {
        setBillingProfile(data)
        billingForm.reset({
          document_type: data.document_type,
          person_first_name: data.person_first_name,
          person_last_name: data.person_last_name,
          person_rut: data.person_rut,
          person_email: data.person_email,
          company_name: data.company_name ?? '',
          company_razon_social: data.company_razon_social ?? '',
          company_rut: data.company_rut ?? '',
          company_giro: data.company_giro ?? '',
        })
      }
    }).catch(() => {})
  }, [billingForm])

  const saveBilling = async (data: BillingForm) => {
    setBillingSaving(true)
    setBillingError('')
    try {
      const { data: updated } = await api.put<BillingProfileData>('/api/v1/billing/profile', data)
      setBillingProfile(updated)
      setEditingBilling(false)
    } catch {
      setBillingError('Error al guardar. Intenta nuevamente.')
    } finally {
      setBillingSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Mi Cuenta</h1>
      <p className="text-sm mb-8" style={{ color: '#64748b' }}>Gestiona tus datos personales y de facturación</p>

      {/* Datos de la cuenta */}
      <SectionCard title="Datos de la cuenta">
        {!editingAccount ? (
          <>
            <dl className="space-y-3">
              {[
                { label: 'Nombre', value: `${account?.first_name ?? ''} ${account?.last_name ?? ''}`.trim() || '—' },
                { label: 'Email', value: account?.email ?? '—' },
                { label: 'Empresa', value: account?.company_name ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4">
                  <dt className="w-24 text-sm shrink-0" style={{ color: '#64748b' }}>{label}</dt>
                  <dd className="text-sm" style={{ color: '#f1f5f9' }}>{value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => setEditingAccount(true)}
              className="mt-5 text-sm px-4 py-2 rounded-lg btn-ghost-cyan"
            >
              Editar datos
            </button>
          </>
        ) : (
          <form onSubmit={accountForm.handleSubmit(saveAccount)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
                <input {...accountForm.register('first_name')} className={inputClass} />
                {accountForm.formState.errors.first_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.first_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
                <input {...accountForm.register('last_name')} className={inputClass} />
                {accountForm.formState.errors.last_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre empresa</label>
              <input {...accountForm.register('company_name')} className={inputClass} />
              {accountForm.formState.errors.company_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.company_name.message}</p>}
            </div>
            {accountError && <p className="text-sm" style={{ color: '#f87171' }}>{accountError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={accountSaving} className="btn-cyan px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {accountSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingAccount(false)} className="text-sm px-5 py-2 rounded-lg" style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Datos de facturación */}
      <SectionCard title="Datos de facturación">
        {!billingProfile && !editingBilling ? (
          <>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              Completa tus datos de facturación luego de tu primer pago.
            </p>
            <button onClick={() => setEditingBilling(true)} className="text-sm px-4 py-2 rounded-lg btn-ghost-cyan">
              Agregar datos
            </button>
          </>
        ) : !editingBilling ? (
          <>
            <dl className="space-y-3">
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Tipo</dt>
                <dd className="text-sm capitalize" style={{ color: '#f1f5f9' }}>{billingProfile?.document_type}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Nombre</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_first_name} {billingProfile?.person_last_name}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>RUT</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_rut}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Email</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_email}</dd>
              </div>
              {billingProfile?.document_type === 'factura' && (
                <>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Empresa</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_name}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Razón Social</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_razon_social}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>RUT empresa</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_rut}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Giro</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_giro}</dd>
                  </div>
                </>
              )}
            </dl>
            <button onClick={() => setEditingBilling(true)} className="mt-5 text-sm px-4 py-2 rounded-lg btn-ghost-cyan">
              Editar
            </button>
          </>
        ) : (
          <form onSubmit={billingForm.handleSubmit(saveBilling)} className="space-y-4">
            <div className="flex gap-4">
              {(['boleta', 'factura'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-sm capitalize"
                  style={{ color: billingDocType === type ? '#06b6d4' : '#94a3b8' }}>
                  <input type="radio" value={type} {...billingForm.register('document_type')} className="accent-cyan-400" />
                  {type}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
                <input {...billingForm.register('person_first_name')} className={inputClass} />
                {billingForm.formState.errors.person_first_name && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_first_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
                <input {...billingForm.register('person_last_name')} className={inputClass} />
                {billingForm.formState.errors.person_last_name && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_last_name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>RUT</label>
                <input {...billingForm.register('person_rut')} placeholder="12.345.678-9" className={inputClass} />
                {billingForm.formState.errors.person_rut && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_rut.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Email</label>
                <input {...billingForm.register('person_email')} type="email" className={inputClass} />
                {billingForm.formState.errors.person_email && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_email.message}</p>}
              </div>
            </div>
            {billingDocType === 'factura' && (
              <>
                <div className="pt-3 mt-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#64748b', borderTop: '1px solid rgba(6,182,212,0.1)' }}>
                  Datos empresa
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre empresa</label>
                  <input {...billingForm.register('company_name')} className={inputClass} />
                  {billingForm.formState.errors.company_name && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_name.message}</p>}
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Razón Social</label>
                  <input {...billingForm.register('company_razon_social')} className={inputClass} />
                  {billingForm.formState.errors.company_razon_social && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_razon_social.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={{ color: '#94a3b8' }}>RUT empresa</label>
                    <input {...billingForm.register('company_rut')} placeholder="76.543.210-K" className={inputClass} />
                    {billingForm.formState.errors.company_rut && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_rut.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: '#94a3b8' }}>Giro</label>
                    <input {...billingForm.register('company_giro')} placeholder="Desarrollo de Software" className={inputClass} />
                    {billingForm.formState.errors.company_giro && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_giro.message}</p>}
                  </div>
                </div>
              </>
            )}
            {billingError && <p className="text-sm" style={{ color: '#f87171' }}>{billingError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={billingSaving} className="btn-cyan px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {billingSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingBilling(false)} className="text-sm px-5 py-2 rounded-lg" style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  )
}
```

- [ ] **Step 2: Add /cuenta to Sidebar**

In `frontend/components/dashboard/Sidebar.tsx`, update `navItems`:

```tsx
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/cuenta', label: 'Cuenta', icon: '👤' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/logs', label: 'Logs', icon: '📋' },
  { href: '/suscripcion', label: 'Suscripción', icon: '💳' },
]
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/'(dashboard)'/cuenta/page.tsx frontend/components/dashboard/Sidebar.tsx
git commit -m "feat: add /cuenta page with account and billing profile sections"
```

---

## Task 9: Build verification + deploy

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend
pytest --cov=app --cov-report=term-missing --cov-fail-under=70 -v
```

Expected: all tests pass, coverage ≥ 70%.

- [ ] **Step 2: Run frontend build**

```bash
cd frontend
npm run build
```

Expected: Build compiled successfully. Fix any TypeScript errors before continuing.

- [ ] **Step 3: Run frontend lint**

```bash
cd frontend
npm run lint
```

Expected: No errors.

- [ ] **Step 4: Push to trigger CI + deploy**

```bash
git push origin main
```

Expected: GitHub Actions runs CI (lint + tests) and deploy-backend (SSH to Hetzner). Monitor at GitHub Actions tab.

- [ ] **Step 5: Apply migration on production server**

After deploy completes, run on the Hetzner server:

```bash
cd /var/www/clientefiel/repo/backend
source /var/www/clientefiel/venv/bin/activate
alembic upgrade head
```

Expected output includes: `Running upgrade e5a3c2b1d9f7 -> <hash>, add_user_name_and_billing_profile`
