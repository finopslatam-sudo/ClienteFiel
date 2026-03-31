# backend/app/api/webhooks.py
import hashlib
import hmac
import json
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import is_message_processed, mark_message_processed
from app.models.whatsapp import WhatsappConnection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_meta_signature(payload: bytes, signature_header: str) -> bool:
    """Validar X-Hub-Signature-256 de Meta."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.meta_app_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    received = signature_header.split("sha256=", 1)[1]
    return hmac.compare_digest(expected, received)


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    """Meta verifica el endpoint con este GET antes de activar el webhook."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_webhook_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Recibir mensajes entrantes de WhatsApp. Siempre retornar 200 en < 20 seg."""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    if not _verify_meta_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=200)  # Meta espera 200 siempre

    # Extraer mensajes y verificar idempotencia
    entries = data.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            messages = change.get("value", {}).get("messages", [])
            for message in messages:
                meta_message_id = message.get("id")
                if not meta_message_id:
                    continue

                # Idempotencia: ignorar mensajes ya procesados
                try:
                    if await is_message_processed(meta_message_id):
                        logger.info({"event": "webhook.duplicate", "meta_message_id": meta_message_id})
                        continue
                    await mark_message_processed(meta_message_id)
                except Exception:
                    pass  # Redis unavailable — proceed without idempotency check

                # Identificar tenant por phone_number_id
                phone_number_id = change.get("value", {}).get("metadata", {}).get("phone_number_id")
                if phone_number_id:
                    result = await db.execute(
                        select(WhatsappConnection).where(
                            WhatsappConnection.phone_number_id == phone_number_id,
                            WhatsappConnection.is_active == True,
                        )
                    )
                    conn = result.scalar_one_or_none()
                    if conn:
                        logger.info({
                            "event": "webhook.received",
                            "tenant_id": str(conn.tenant_id),
                            "meta_message_id": meta_message_id,
                        })

    return Response(status_code=200)


@router.post("/stripe")
async def receive_stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Procesar eventos de Stripe para actualizar estado de suscripcion."""
    import stripe
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(body, sig, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    from sqlalchemy import update
    from app.models.subscription import Subscription
    from app.models.tenant import TenantStatus

    if event["type"] == "customer.subscription.updated":
        sub_data = event["data"]["object"]
        stripe_sub_id = sub_data["id"]
        new_status = sub_data["status"]
        status_map = {
            "active": TenantStatus.active,
            "past_due": TenantStatus.past_due,
            "canceled": TenantStatus.canceled,
        }
        if new_status in status_map:
            await db.execute(
                update(Subscription)
                .where(Subscription.stripe_subscription_id == stripe_sub_id)
                .values(status=status_map[new_status])
            )
            await db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        await db.execute(
            update(Subscription)
            .where(Subscription.stripe_subscription_id == sub_data["id"])
            .values(status=TenantStatus.canceled)
        )
        await db.commit()

    return {"status": "ok"}
