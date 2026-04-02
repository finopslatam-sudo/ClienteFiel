# backend/tests/conftest.py
import os
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.tenant import Tenant, TenantPlan, TenantStatus
import app.models  # noqa

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://clientefiel:password@localhost:5432/clientefiel_db",
)


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

    fastapi_app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
        yield c
    fastapi_app.dependency_overrides.clear()


async def register_and_login(client: AsyncClient, email: str, business: str) -> str:
    """Helper: registrar un tenant y retornar su access_token."""
    response = await client.post("/api/v1/auth/register", json={
        "business_name": business,
        "email": email,
        "password": "testpassword123",
    })
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def db_session(db_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    async_session = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def tenant(db_session):
    import uuid
    from datetime import datetime, timedelta, timezone
    t = Tenant(
        name="Test Negocio",
        slug=f"test-negocio-{uuid.uuid4().hex[:8]}",
        plan=TenantPlan.basic,
        status=TenantStatus.trial,
        trial_ends_at=(datetime.now(timezone.utc) + timedelta(days=14)).replace(tzinfo=None),
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return t
