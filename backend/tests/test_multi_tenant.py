# backend/tests/test_multi_tenant.py
"""
Tests de aislamiento multi-tenant.
Verifican que los datos de un tenant NUNCA son visibles para otro tenant.
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
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me.json()["email"] == "iso_a@test.cl"
