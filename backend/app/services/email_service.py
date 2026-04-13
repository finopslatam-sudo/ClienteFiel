# backend/app/services/email_service.py
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_subscription_notification(
    *,
    tenant_name: str,
    tenant_slug: str,
    plan: str,
    payer_email: str,
    preapproval_id: str,
) -> None:
    """
    Envía notificación a contacto@riava.cl cuando una suscripción se activa.
    El error en el envío no propaga excepción — es best-effort.
    """
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning({"event": "email.smtp_not_configured"})
        return

    plan_labels = {"basic": "Básico", "medium": "Medio", "premium": "Premium"}
    plan_label = plan_labels.get(plan, plan.capitalize())

    subject = f"[Cliente Fiel] Nueva suscripción — {tenant_name} ({plan_label})"

    body_text = f"""\
Nueva suscripción activada en Cliente Fiel
==========================================

Cliente:         {tenant_name}
Slug:            {tenant_slug}
Plan:            {plan_label}
Email pagador:   {payer_email}
ID Mercado Pago: {preapproval_id}

---
Este es un correo automático del sistema Cliente Fiel.
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = settings.notification_email
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info({
            "event": "email.subscription_notification_sent",
            "tenant_name": tenant_name,
            "to": settings.notification_email,
        })
    except Exception:
        logger.exception({
            "event": "email.subscription_notification_failed",
            "tenant_name": tenant_name,
        })
