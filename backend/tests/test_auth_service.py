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
