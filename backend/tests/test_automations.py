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


@pytest.mark.asyncio
async def test_create_and_list_reminders_with_medium_plan(client: AsyncClient, db_session):
    """Con plan medium, se puede crear y listar recordatorios."""
    from app.models.tenant import TenantPlan, Tenant
    from app.models.user import User
    token = await register_and_login(client, "medrem@test.com", "Med Negocio")

    # Obtener tenant y cambiar plan a medium para el test
    user_result = await db_session.execute(select(User).where(User.email == "medrem@test.com"))
    user = user_result.scalar_one()
    tenant_result = await db_session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one()
    tenant.plan = TenantPlan.medium
    await db_session.commit()

    r = await client.post(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
        json={"message_text": "Hola {nombre}, tienes cita de {servicio}", "days_before": 2},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["message_text"] == "Hola {nombre}, tienes cita de {servicio}"
    assert data["days_before"] == 2

    r2 = await client.get(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 200
    assert len(r2.json()) == 1


@pytest.mark.asyncio
async def test_reminder_isolation_between_tenants(client: AsyncClient, db_session):
    """Un tenant no puede ver ni editar recordatorios de otro tenant."""
    from app.models.tenant import TenantPlan, Tenant
    from app.models.user import User
    from sqlalchemy import select

    # Tenant A crea un recordatorio
    token_a = await register_and_login(client, "tenantA@test.com", "Negocio A")
    user_a_result = await db_session.execute(select(User).where(User.email == "tenantA@test.com"))
    user_a = user_a_result.scalar_one()
    tenant_a_result = await db_session.execute(select(Tenant).where(Tenant.id == user_a.tenant_id))
    tenant_a = tenant_a_result.scalar_one()
    tenant_a.plan = TenantPlan.medium
    await db_session.commit()

    r = await client.post(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"message_text": "Mensaje de A", "days_before": 1},
    )
    assert r.status_code == 201
    reminder_id = r.json()["id"]

    # Tenant B intenta editar el recordatorio de A
    token_b = await register_and_login(client, "tenantB@test.com", "Negocio B")
    r2 = await client.put(
        f"/api/v1/automations/reminders/{reminder_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"message_text": "Hackeado"},
    )
    # Tenant B no tiene plan medium → 403 (plan-gating tiene precedencia)
    # Incluso si tuviera medium, recibiría 404 porque el recordatorio no es suyo
    assert r2.status_code in (403, 404)

    # Tenant B no ve recordatorios de A en su lista
    r3 = await client.get(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert r3.status_code == 200
    ids = [item["id"] for item in r3.json()]
    assert reminder_id not in ids


@pytest.mark.asyncio
async def test_create_campaign_with_premium_plan(client: AsyncClient):
    """Con plan premium, se puede crear y togglear campañas."""
    token = await register_and_login(client, "premcamp@test.com", "Prem Negocio")
    # Los tenants se crean con premium por default en trial

    r = await client.post(
        "/api/v1/automations/campaigns",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Campaña te extrañamos",
            "message_text": "Hola {nombre}, ¡te extrañamos en {negocio}!",
            "trigger_type": "inactive_days",
            "trigger_value": 30,
        },
    )
    assert r.status_code == 201
    campaign_id = r.json()["id"]
    assert r.json()["active"] is False

    # Toggle activar
    r2 = await client.patch(
        f"/api/v1/automations/campaigns/{campaign_id}/toggle",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 200
    assert r2.json()["active"] is True


@pytest.mark.asyncio
async def test_delete_reminder(client: AsyncClient, db_session):
    """Se puede eliminar un recordatorio propio."""
    from app.models.tenant import TenantPlan, Tenant
    from app.models.user import User
    from sqlalchemy import select

    token = await register_and_login(client, "delrem@test.com", "Del Negocio")
    user_result = await db_session.execute(select(User).where(User.email == "delrem@test.com"))
    user = user_result.scalar_one()
    tenant_result = await db_session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one()
    tenant.plan = TenantPlan.medium
    await db_session.commit()

    r = await client.post(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
        json={"message_text": "Borrar esto", "days_before": 1},
    )
    assert r.status_code == 201
    reminder_id = r.json()["id"]

    r2 = await client.delete(
        f"/api/v1/automations/reminders/{reminder_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 204

    r3 = await client.get(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(r3.json()) == 0


@pytest.mark.asyncio
async def test_send_repurchase_skips_if_already_sent():
    """Si repurchase_sent_at ya está seteado, no envía."""
    from unittest.mock import patch, MagicMock, AsyncMock
    from app.tasks.automations import _send_repurchase_async

    with patch("app.tasks.automations.get_booking_with_tenant", new_callable=AsyncMock) as mock_get:
        mock_booking = MagicMock()
        mock_booking.repurchase_sent_at = "2026-01-01"  # ya enviado
        mock_get.return_value = mock_booking
        with patch("app.tasks.automations.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            task_mock = MagicMock()
            await _send_repurchase_async(task_mock, "00000000-0000-0000-0000-000000000001")
            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_send_repurchase_skips_if_settings_disabled():
    """Si repurchase_enabled=False, no envía."""
    from unittest.mock import patch, MagicMock, AsyncMock
    from app.tasks.automations import _send_repurchase_async

    with patch("app.tasks.automations.get_booking_with_tenant", new_callable=AsyncMock) as mock_get:
        mock_booking = MagicMock()
        mock_booking.repurchase_sent_at = None
        mock_get.return_value = mock_booking

        with patch("app.tasks.automations.get_automation_settings", new_callable=AsyncMock) as mock_settings:
            mock_settings.return_value = None  # sin settings = disabled
            with patch("app.tasks.automations.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
                task_mock = MagicMock()
                await _send_repurchase_async(task_mock, "00000000-0000-0000-0000-000000000001")
                mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_update_settings_premium_success(client: AsyncClient):
    """PUT /settings con plan premium actualiza los campos correctamente."""
    token = await register_and_login(client, "updset@test.com", "UpdSet Negocio")
    # Tenants nuevos son premium por default en trial

    r = await client.put(
        "/api/v1/automations/settings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "repurchase_enabled": True,
            "repurchase_days_after": 14,
            "repurchase_message": "Hola {nombre}, te esperamos en {negocio}",
            "points_enabled": True,
            "points_per_visit": 20,
            "points_redeem_threshold": 200,
            "points_reward_description": "Descuento 10%",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["repurchase_enabled"] is True
    assert data["repurchase_days_after"] == 14
    assert data["points_per_visit"] == 20
    assert data["points_redeem_threshold"] == 200


@pytest.mark.asyncio
async def test_update_reminder_success(client: AsyncClient, db_session):
    """PUT /reminders/{id} actualiza el recordatorio correctamente."""
    from app.models.tenant import TenantPlan, Tenant
    from app.models.user import User

    token = await register_and_login(client, "updrem@test.com", "UpdRem Negocio")
    user_result = await db_session.execute(select(User).where(User.email == "updrem@test.com"))
    user = user_result.scalar_one()
    tenant_result = await db_session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one()
    tenant.plan = TenantPlan.medium
    await db_session.commit()

    r = await client.post(
        "/api/v1/automations/reminders",
        headers={"Authorization": f"Bearer {token}"},
        json={"message_text": "Mensaje original", "days_before": 1},
    )
    assert r.status_code == 201
    reminder_id = r.json()["id"]

    r2 = await client.put(
        f"/api/v1/automations/reminders/{reminder_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"message_text": "Mensaje actualizado", "days_before": 3},
    )
    assert r2.status_code == 200
    data = r2.json()
    assert data["message_text"] == "Mensaje actualizado"
    assert data["days_before"] == 3


@pytest.mark.asyncio
async def test_update_campaign_success(client: AsyncClient):
    """PUT /campaigns/{id} actualiza la campaña correctamente."""
    token = await register_and_login(client, "updcamp@test.com", "UpdCamp Negocio")

    r = await client.post(
        "/api/v1/automations/campaigns",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Campaña original",
            "message_text": "Mensaje {nombre}",
            "trigger_type": "inactive_days",
            "trigger_value": 30,
        },
    )
    assert r.status_code == 201
    campaign_id = r.json()["id"]

    r2 = await client.put(
        f"/api/v1/automations/campaigns/{campaign_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Campaña actualizada", "trigger_value": 60},
    )
    assert r2.status_code == 200
    data = r2.json()
    assert data["name"] == "Campaña actualizada"
    assert data["trigger_value"] == 60


@pytest.mark.asyncio
async def test_delete_campaign_success(client: AsyncClient):
    """DELETE /campaigns/{id} elimina la campaña y ya no aparece en listado."""
    token = await register_and_login(client, "delcamp@test.com", "DelCamp Negocio")

    r = await client.post(
        "/api/v1/automations/campaigns",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Para borrar",
            "message_text": "Hola {nombre}",
            "trigger_type": "inactive_days",
            "trigger_value": 45,
        },
    )
    assert r.status_code == 201
    campaign_id = r.json()["id"]

    r2 = await client.delete(
        f"/api/v1/automations/campaigns/{campaign_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 204

    r3 = await client.get(
        "/api/v1/automations/campaigns",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r3.status_code == 200
    assert len(r3.json()) == 0


@pytest.mark.asyncio
async def test_complete_booking_does_not_error(client: AsyncClient):
    """PATCH /complete en una reserva no produce error — el encolado de recompra es opcional."""
    token = await register_and_login(client, "compbook@test.com", "CompBook Negocio")

    # Crear servicio
    svc_r = await client.post(
        "/api/v1/services",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Corte", "duration_minutes": 30, "price": "10000"},
    )
    assert svc_r.status_code == 201
    service_id = svc_r.json()["id"]

    # Crear reserva
    book_r = await client.post(
        "/api/v1/bookings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "customer_phone": "+56911111111",
            "service_id": service_id,
            "scheduled_at": "2026-06-01T10:00:00",
        },
    )
    assert book_r.status_code == 201
    booking_id = book_r.json()["id"]

    # Marcar como completada — no debe lanzar error
    from unittest.mock import patch
    with patch("app.tasks.automations.send_repurchase_message") as mock_task:
        mock_task.apply_async = lambda *a, **kw: None
        r = await client.patch(
            f"/api/v1/bookings/{booking_id}/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
