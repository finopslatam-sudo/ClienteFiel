# backend/tests/test_tenant.py
import pytest
from httpx import AsyncClient
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_get_tenant_profile(client: AsyncClient):
    """GET /tenant/profile retorna datos del negocio del tenant autenticado."""
    token = await register_and_login(client, "profileget@test.com", "Mi Negocio SA")
    r = await client.get(
        "/api/v1/tenant/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Mi Negocio SA"
    assert "slug" in data
    assert "plan" in data
    assert "status" in data


@pytest.mark.asyncio
async def test_update_tenant_profile(client: AsyncClient):
    """PATCH /tenant/profile actualiza nombre y zona horaria del negocio."""
    token = await register_and_login(client, "profileup@test.com", "Negocio Original")
    r = await client.patch(
        "/api/v1/tenant/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Negocio Actualizado", "timezone": "America/Santiago"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Negocio Actualizado"
    assert data["timezone"] == "America/Santiago"


def test_time_slot_model_importable():
    """TimeSlot model puede importarse y tiene la tabla correcta."""
    from app.models.time_slot import TimeSlot
    assert TimeSlot.__tablename__ == "time_slots"
