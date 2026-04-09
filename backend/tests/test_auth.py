# backend/tests/test_auth.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "first_name": "Ana",
        "last_name": "López",
        "business_name": "Peluquería Style",
        "email": "owner@style.cl",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "owner@style.cl"
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"first_name": "Test", "last_name": "User", "business_name": "Negocio", "email": "dup@test.cl", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "first_name": "Spa",
        "last_name": "Relax",
        "business_name": "Spa Relax",
        "email": "spa@relax.cl",
        "password": "mypassword",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "spa@relax.cl",
        "password": "mypassword",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "first_name": "Test", "last_name": "User", "business_name": "Negocio", "email": "wrong@test.cl", "password": "correct",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrong@test.cl", "password": "incorrect",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403  # HTTPBearer retorna 403 si no hay header


@pytest.mark.asyncio
async def test_protected_endpoint_with_valid_token(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "first_name": "Doc", "last_name": "Test", "business_name": "Consultorio", "email": "doc@test.cl", "password": "pass1234",
    })
    token = reg.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "doc@test.cl"
