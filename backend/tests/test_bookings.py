import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_create_booking_manual(client: AsyncClient):
    token = await register_and_login(client, "bookings@test.cl", "Spa Test")
    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Masaje", "duration_minutes": 60, "price": "25000"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert svc_resp.status_code == 201
    service_id = svc_resp.json()["id"]
    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "customer_phone": "+56911111111",
            "customer_name": "Ana García",
            "service_id": service_id,
            "scheduled_at": scheduled,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["created_by"] == "admin"


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient):
    token = await register_and_login(client, "cancel@test.cl", "Peluquería Cancel")
    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Corte", "duration_minutes": 30, "price": "10000"},
        headers={"Authorization": f"Bearer {token}"},
    )
    service_id = svc_resp.json()["id"]
    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    booking_resp = await client.post(
        "/api/v1/bookings",
        json={
            "customer_phone": "+56922222222",
            "service_id": service_id,
            "scheduled_at": scheduled,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    booking_id = booking_resp.json()["id"]
    cancel_resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "canceled"


@pytest.mark.asyncio
async def test_booking_isolation_between_tenants(client: AsyncClient):
    token_a = await register_and_login(client, "tenant_book_a@test.cl", "Negocio A")
    token_b = await register_and_login(client, "tenant_book_b@test.cl", "Negocio B")
    svc_resp = await client.post(
        "/api/v1/services",
        json={"name": "Corte", "duration_minutes": 30, "price": "10000"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    service_id = svc_resp.json()["id"]
    scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    booking_resp = await client.post(
        "/api/v1/bookings",
        json={
            "customer_phone": "+56933333333",
            "service_id": service_id,
            "scheduled_at": scheduled,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    booking_id = booking_resp.json()["id"]
    resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
