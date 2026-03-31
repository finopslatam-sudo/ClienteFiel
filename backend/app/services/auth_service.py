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
            trial_ends_at=(datetime.now(timezone.utc) + timedelta(days=14)).replace(tzinfo=None),
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
