from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.services.whatsapp_service import WhatsappService
from app.schemas.whatsapp import WhatsappConnectRequest, WhatsappStatusResponse

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.post("/connect", response_model=WhatsappStatusResponse)
async def connect_whatsapp(
    payload: WhatsappConnectRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    try:
        conn = await service.connect(
            tenant_id=str(current_tenant.id),
            code=payload.code,
            phone_number_id=payload.phone_number_id,
            waba_id=payload.waba_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect WhatsApp: {type(e).__name__}")
    return WhatsappStatusResponse(
        connected=True,
        phone_number=conn.phone_number,
        verified_at=conn.verified_at.isoformat() if conn.verified_at else None,
    )


@router.get("/status", response_model=WhatsappStatusResponse)
async def get_whatsapp_status(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    conn = await service.get_status(str(current_tenant.id))
    if not conn:
        return WhatsappStatusResponse(connected=False)
    return WhatsappStatusResponse(
        connected=True,
        phone_number=conn.phone_number,
        verified_at=conn.verified_at.isoformat() if conn.verified_at else None,
    )


@router.post("/disconnect")
async def disconnect_whatsapp(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = WhatsappService(db)
    await service.disconnect(str(current_tenant.id))
    return {"message": "WhatsApp disconnected"}
