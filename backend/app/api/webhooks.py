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
from app.services.billing_service import BillingService

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
                            WhatsappConnection.is_active,
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


def _verify_mp_signature(payload: bytes, signature_header: str, ts: str) -> bool:
    """Valida x-signature de Mercado Pago usando HMAC-SHA256."""
    secret = settings.mp_webhook_secret
    if not secret:
        return True  # sin secret configurado, permitir (dev/sandbox)
    try:
        signed_template = f"ts={ts};v1={payload.decode()}"
        expected = hmac.new(secret.encode(), signed_template.encode(), hashlib.sha256).hexdigest()
        for part in signature_header.split(","):
            part = part.strip()
            if part.startswith("v1=") and hmac.compare_digest(part[3:], expected):
                return True
    except Exception:
        pass
    return False


@router.post("/mercadopago")
async def receive_mercadopago_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    IPN de Mercado Pago para suscripciones recurrentes (Preapproval).
    MP envía: {"type": "subscription_preapproval", "data": {"id": "..."}}
    Siempre retornar 200 — MP reintenta si no recibe 200.
    """
    raw_body = await request.body()

    sig_header = request.headers.get("x-signature", "")
    ts_header = request.headers.get("x-request-id", "")
    if sig_header and not _verify_mp_signature(raw_body, sig_header, ts_header):
        logger.warning({"event": "webhook.mp_invalid_signature"})
        return Response(status_code=200)

    try:
        body = json.loads(raw_body)
    except Exception:
        return Response(status_code=200)

    topic = body.get("type") or request.query_params.get("topic")
    resource_id = (
        body.get("data", {}).get("id")
        or request.query_params.get("id")
    )

    if topic not in ("subscription_preapproval", "preapproval") or not resource_id:
        return Response(status_code=200)

    try:
        service = BillingService(db)
        await service.handle_mp_webhook(preapproval_id=resource_id)
    except Exception:
        logger.exception({
            "event": "webhook.mp_processing_error",
            "resource_id": resource_id,
        })

    return Response(status_code=200)
