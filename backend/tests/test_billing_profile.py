import pytest
from httpx import AsyncClient
from tests.conftest import register_and_login


BOLETA_PAYLOAD = {
    "document_type": "boleta",
    "person_first_name": "Richard",
    "person_last_name": "Chamorro",
    "person_rut": "12.345.678-9",
    "person_email": "richard@test.cl",
}

FACTURA_PAYLOAD = {
    "document_type": "factura",
    "person_first_name": "Richard",
    "person_last_name": "Chamorro",
    "person_rut": "12.345.678-9",
    "person_email": "richard@test.cl",
    "company_name": "Riava SpA",
    "company_razon_social": "Riava Servicios SpA",
    "company_rut": "76.543.210-K",
    "company_giro": "Desarrollo de Software",
}


@pytest.mark.asyncio
async def test_get_billing_profile_returns_null_when_missing(client: AsyncClient):
    token = await register_and_login(client, "bp_get@test.cl", "Negocio BP")
    resp = await client.get(
        "/api/v1/billing/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_upsert_billing_profile_boleta(client: AsyncClient):
    token = await register_and_login(client, "bp_boleta@test.cl", "Negocio Boleta")
    resp = await client.put(
        "/api/v1/billing/profile",
        json=BOLETA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document_type"] == "boleta"
    assert data["person_first_name"] == "Richard"
    assert data["company_name"] is None


@pytest.mark.asyncio
async def test_upsert_billing_profile_factura(client: AsyncClient):
    token = await register_and_login(client, "bp_factura@test.cl", "Negocio Factura")
    resp = await client.put(
        "/api/v1/billing/profile",
        json=FACTURA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document_type"] == "factura"
    assert data["company_name"] == "Riava SpA"
    assert data["company_giro"] == "Desarrollo de Software"


@pytest.mark.asyncio
async def test_upsert_billing_profile_factura_missing_company_returns_422(client: AsyncClient):
    token = await register_and_login(client, "bp_422@test.cl", "Negocio 422")
    incomplete = {**BOLETA_PAYLOAD, "document_type": "factura"}
    resp = await client.put(
        "/api/v1/billing/profile",
        json=incomplete,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upsert_billing_profile_updates_existing(client: AsyncClient):
    token = await register_and_login(client, "bp_update@test.cl", "Negocio Update")
    await client.put(
        "/api/v1/billing/profile",
        json=BOLETA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    updated = {**BOLETA_PAYLOAD, "person_first_name": "Ana"}
    resp = await client.put(
        "/api/v1/billing/profile",
        json=updated,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["person_first_name"] == "Ana"


@pytest.mark.asyncio
async def test_get_billing_profile_returns_saved_data(client: AsyncClient):
    token = await register_and_login(client, "bp_read@test.cl", "Negocio Read")
    await client.put(
        "/api/v1/billing/profile",
        json=FACTURA_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/v1/billing/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["document_type"] == "factura"


@pytest.mark.asyncio
async def test_billing_profile_isolated_between_tenants(client: AsyncClient):
    token_a = await register_and_login(client, "bp_iso_a@test.cl", "Empresa ISO A")
    token_b = await register_and_login(client, "bp_iso_b@test.cl", "Empresa ISO B")
    await client.put(
        "/api/v1/billing/profile",
        json=BOLETA_PAYLOAD,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    resp = await client.get(
        "/api/v1/billing/profile",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.json() is None