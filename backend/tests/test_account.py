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