# backend/tests/conftest.py
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.main import app as fastapi_app
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
