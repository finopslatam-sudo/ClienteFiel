# backend/tests/test_billing.py
import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.billing_service import BillingService, PLAN_PRICES_CLP
from app.models.tenant import TenantPlan, TenantStatus
from app.models.subscription import PaymentProvider
from tests.conftest import register_and_login


def _mock_mp_sdk(preapproval_response: dict):
    """Helper: crea un mock del SDK de Mercado Pago."""
    sdk = MagicMock()
    sdk.preapproval().create.return_value = preapproval_response
    sdk.preapproval().get.return_value = preapproval_response
    sdk.preapproval().update.return_value = {"status": 200, "response": {}}
    return sdk


# ---------------------------------------------------------------------------
# BillingService unit tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_subscription_returns_none_when_missing(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    result = await service.get_subscription(tenant.id)
    assert result is None


@pytest.mark.asyncio
async def test_upsert_creates_subscription(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    ext_id = "mp-preapproval-001"
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.basic,
        provider=PaymentProvider.mercadopago,
        external_subscription_id=ext_id,
        status=TenantStatus.trial,
    )
    sub = await service.get_subscription(tenant.id)
    assert sub is not None
    assert sub.external_subscription_id == ext_id
    assert sub.provider == PaymentProvider.mercadopago


@pytest.mark.asyncio
async def test_upsert_updates_existing_subscription(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.basic,
        provider=PaymentProvider.mercadopago,
        external_subscription_id="old-id",
        status=TenantStatus.trial,
    )
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.medium,
        provider=PaymentProvider.mercadopago,
        external_subscription_id="new-id",
        status=TenantStatus.active,
    )
    sub = await service.get_subscription(tenant.id)
    assert sub.external_subscription_id == "new-id"
    assert sub.plan == TenantPlan.medium
    assert sub.status == TenantStatus.active


@pytest.mark.asyncio
async def test_create_mp_subscription_success(db_session: AsyncSession, tenant):
    mp_response = {
        "status": 201,
        "response": {
            "id": "preapproval-123",
            "init_point": "https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=abc",
        },
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        service = BillingService(db_session)
        url = await service.create_mp_subscription(
            tenant_id=tenant.id,
            plan=TenantPlan.basic,
            back_url="https://clientefiel.riava.cl/dashboard",
            payer_email="test@example.com",
        )

    assert "mercadopago" in url or "checkout" in url
    sub = await service.get_subscription(tenant.id)
    assert sub is not None
    assert sub.external_subscription_id == "preapproval-123"
    assert sub.status == TenantStatus.trial


@pytest.mark.asyncio
async def test_create_mp_subscription_mp_error_raises(db_session: AsyncSession, tenant):
    mp_response = {
        "status": 400,
        "response": {"message": "invalid credentials"},
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        service = BillingService(db_session)
        with pytest.raises(ValueError, match="Mercado Pago error"):
            await service.create_mp_subscription(
                tenant_id=tenant.id,
                plan=TenantPlan.medium,
                back_url="https://clientefiel.riava.cl/dashboard",
                payer_email="test@example.com",
            )


@pytest.mark.asyncio
async def test_handle_mp_webhook_authorized_sets_active(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.basic,
        provider=PaymentProvider.mercadopago,
        external_subscription_id="preapproval-abc",
        status=TenantStatus.trial,
    )

    mp_response = {
        "status": 200,
        "response": {
            "id": "preapproval-abc",
            "status": "authorized",
            "external_reference": str(tenant.id),
            "payer_id": "payer-999",
        },
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        await service.handle_mp_webhook("preapproval-abc")

    sub = await service.get_subscription(tenant.id)
    assert sub.status == TenantStatus.active


@pytest.mark.asyncio
async def test_handle_mp_webhook_cancelled_sets_canceled(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.basic,
        provider=PaymentProvider.mercadopago,
        external_subscription_id="preapproval-xyz",
        status=TenantStatus.active,
    )

    mp_response = {
        "status": 200,
        "response": {
            "id": "preapproval-xyz",
            "status": "cancelled",
            "external_reference": str(tenant.id),
        },
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        await service.handle_mp_webhook("preapproval-xyz")

    sub = await service.get_subscription(tenant.id)
    assert sub.status == TenantStatus.canceled


@pytest.mark.asyncio
async def test_handle_mp_webhook_invalid_external_reference(db_session: AsyncSession, tenant):
    """external_reference inválido no debe lanzar excepción."""
    mp_response = {
        "status": 200,
        "response": {
            "id": "preapproval-bad",
            "status": "authorized",
            "external_reference": "not-a-uuid",
        },
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        service = BillingService(db_session)
        await service.handle_mp_webhook("preapproval-bad")  # no debe lanzar


@pytest.mark.asyncio
async def test_handle_mp_webhook_failed_fetch(db_session: AsyncSession, tenant):
    """Si MP retorna error al fetch, se loguea y no hace nada."""
    mp_response = {"status": 404, "response": {}}
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        service = BillingService(db_session)
        await service.handle_mp_webhook("nonexistent-id")  # no debe lanzar


@pytest.mark.asyncio
async def test_cancel_subscription_success(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    await service._upsert_subscription(
        tenant_id=tenant.id,
        plan=TenantPlan.basic,
        provider=PaymentProvider.mercadopago,
        external_subscription_id="preapproval-cancel",
        status=TenantStatus.active,
    )

    mock_sdk = MagicMock()
    mock_sdk.preapproval().update.return_value = {"status": 200, "response": {}}

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        await service.cancel_subscription(tenant.id)

    sub = await service.get_subscription(tenant.id)
    assert sub.status == TenantStatus.canceled


@pytest.mark.asyncio
async def test_cancel_subscription_no_subscription_raises(db_session: AsyncSession, tenant):
    service = BillingService(db_session)
    with pytest.raises(ValueError, match="No active subscription found"):
        await service.cancel_subscription(tenant.id)


# ---------------------------------------------------------------------------
# Billing API integration tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_subscription_no_subscription(client: AsyncClient):
    token = await register_and_login(client, "billing_get@test.cl", "Billing Test")
    resp = await client.get(
        "/api/v1/billing/subscription",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] in ("basic", "medium", "premium")
    assert data["provider"] == "none"
    assert data["external_subscription_id"] is None


@pytest.mark.asyncio
async def test_subscribe_creates_checkout_url(client: AsyncClient):
    token = await register_and_login(client, "billing_sub@test.cl", "Sub Test")

    mp_response = {
        "status": 201,
        "response": {
            "id": "preapproval-api-test",
            "init_point": "https://www.mercadopago.cl/checkout/test",
        },
    }
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        resp = await client.post(
            "/api/v1/billing/subscribe",
            json={"plan": "basic", "back_url": "https://clientefiel.riava.cl/dashboard"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    assert "checkout_url" in resp.json()


@pytest.mark.asyncio
async def test_subscribe_mp_error_returns_502(client: AsyncClient):
    token = await register_and_login(client, "billing_err@test.cl", "Err Test")

    mp_response = {"status": 500, "response": {"message": "MP error"}}
    mock_sdk = _mock_mp_sdk(mp_response)

    with patch("app.services.billing_service._mp_sdk", return_value=mock_sdk):
        resp = await client.post(
            "/api/v1/billing/subscribe",
            json={"plan": "premium", "back_url": "https://clientefiel.riava.cl/dashboard"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_cancel_no_subscription_returns_404(client: AsyncClient):
    token = await register_and_login(client, "billing_cancel@test.cl", "Cancel Test")
    resp = await client.post(
        "/api/v1/billing/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_mp_webhook_subscription_preapproval(client: AsyncClient):
    """IPN de MP retorna 200 siempre."""
    resp = await client.post(
        "/api/webhooks/mercadopago",
        json={
            "type": "subscription_preapproval",
            "data": {"id": "preapproval-webhook-test"},
        },
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_mp_webhook_unknown_type_ignored(client: AsyncClient):
    """Tipo desconocido retorna 200 sin procesar."""
    resp = await client.post(
        "/api/webhooks/mercadopago",
        json={"type": "payment", "data": {"id": "12345"}},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_plan_prices_are_defined():
    assert PLAN_PRICES_CLP[TenantPlan.basic] == 1000
    assert PLAN_PRICES_CLP[TenantPlan.medium] == 40000
    assert PLAN_PRICES_CLP[TenantPlan.premium] == 60000
