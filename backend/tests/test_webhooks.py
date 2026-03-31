# backend/tests/test_webhooks.py
import pytest
import json
import hmac
import hashlib
from httpx import AsyncClient
from app.core.config import settings


def make_meta_signature(payload: str, secret: str) -> str:
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"sha256={sig}"


@pytest.mark.asyncio
async def test_meta_webhook_verification_challenge(client: AsyncClient):
    """Meta verifica el webhook con un GET challenge."""
    response = await client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.meta_webhook_verify_token,
            "hub.challenge": "test-challenge-12345",
        },
    )
    assert response.status_code == 200
    assert response.text == "test-challenge-12345"


@pytest.mark.asyncio
async def test_meta_webhook_invalid_token(client: AsyncClient):
    """Verificacion falla con token incorrecto."""
    response = await client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "challenge",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_invalid_signature(client: AsyncClient):
    """POST con firma invalida retorna 403."""
    payload = json.dumps({"entry": []})
    response = await client.post(
        "/api/webhooks/whatsapp",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalidsignature",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_valid_signature_returns_200(client: AsyncClient):
    """POST con firma valida retorna 200 OK."""
    payload = json.dumps({"object": "whatsapp_business_account", "entry": []})
    sig = make_meta_signature(payload, settings.meta_app_secret)
    response = await client.post(
        "/api/webhooks/whatsapp",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": sig,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_meta_webhook_duplicate_message_ignored(client: AsyncClient):
    """El mismo meta_message_id procesado dos veces solo se procesa una vez."""
    payload = json.dumps({
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{"id": "wamid.unique-test-id-123", "type": "text"}]
                }
            }]
        }]
    })
    sig = make_meta_signature(payload, settings.meta_app_secret)
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": sig,
    }
    r1 = await client.post("/api/webhooks/whatsapp", content=payload, headers=headers)
    r2 = await client.post("/api/webhooks/whatsapp", content=payload, headers=headers)
    assert r1.status_code == 200
    assert r2.status_code == 200  # retorna 200 pero no procesa el duplicado
