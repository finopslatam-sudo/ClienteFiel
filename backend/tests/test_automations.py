# backend/tests/test_automations.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tenant import Tenant, TenantPlan
from app.models.user import User
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_get_settings_creates_defaults(client: AsyncClient):
    """GET /settings crea fila con defaults si no existe."""
    token = await register_and_login(client, "auto@test.com", "Auto Negocio")
    r = await client.get(
        "/api/v1/automations/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["repurchase_enabled"] is False
    assert data["points_per_visit"] == 10
    assert data["points_redeem_threshold"] == 100


@pytest.mark.asyncio
async def test_update_settings_requires_premium(client: AsyncClient, db_session: AsyncSession):
    """PUT /settings con campos premium retorna 403 si plan != premium."""
    token = await register_and_login(client, "basic@test.com", "Basic Negocio")

    # Downgrade the tenant to basic so plan-gating is tested
    result = await db_session.execute(
        select(User).where(User.email == "basic@test.com")
    )
    user = result.scalar_one()
    tenant_result = await db_session.execute(
        select(Tenant).where(Tenant.id == user.tenant_id)
    )
    tenant = tenant_result.scalar_one()
    tenant.plan = TenantPlan.basic
    await db_session.commit()

    r = await client.put(
        "/api/v1/automations/settings",
        headers={"Authorization": f"Bearer {token}"},
        json={"repurchase_enabled": True},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_reminder_requires_medium(client: AsyncClient, db_session: AsyncSession):
    """POST /reminders retorna 403 si plan == basic."""
    token = await register_and_login(client, "rem@test.com", "Rem Negocio")

    # Downgrade the tenant to basic so plan-gating is tested
    result = await db_session.execute(
        select(User).where(User.email == "rem@test.com")
    )
    user = result.scalar_one()
    tenant_result = await db_session.execute(
        select(Tenant).where(Tenant.id == user.tenant_id)
    )
    tenant = tenant_result.scalar_one()
    tenant.plan = TenantPlan.basic
    await db_session.commit()

    r = await client.post(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
        json={"message_text": "Hola {nombre}", "days_before": 2},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_reminders_empty(client: AsyncClient):
    """GET /reminders retorna lista vacía si no hay recordatorios."""
    token = await register_and_login(client, "listrem@test.com", "List Negocio")
    r = await client.get(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_campaigns_empty(client: AsyncClient):
    """GET /campaigns retorna lista vacía."""
    token = await register_and_login(client, "camp@test.com", "Camp Negocio")
    r = await client.get(
        "/api/v1/automations/campaigns",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json() == []
