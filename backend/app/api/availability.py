import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant
from app.models.service import Service
from app.services.availability_service import AvailabilityService
from app.schemas.availability import (
    WeeklyScheduleRequest,
    WeeklyScheduleResponse,
    AvailabilityRuleResponse,
    OverrideCreateRequest,
    OverrideResponse,
    SlotListResponse,
    SlotItem,
)

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("/rules", response_model=WeeklyScheduleResponse)
async def get_rules(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    rules = await svc.get_rules(current_tenant.id)
    return WeeklyScheduleResponse(
        rules=[AvailabilityRuleResponse.model_validate(r) for r in rules]
    )


@router.put("/rules", response_model=WeeklyScheduleResponse)
async def upsert_rules(
    payload: WeeklyScheduleRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    rules = await svc.upsert_rules(
        current_tenant.id, [r.model_dump() for r in payload.rules]
    )
    return WeeklyScheduleResponse(
        rules=[AvailabilityRuleResponse.model_validate(r) for r in rules]
    )


@router.get("/slots", response_model=SlotListResponse)
async def get_slots(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(..., alias="date"),
    service_id: uuid.UUID = Query(...),
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.tenant_id == current_tenant.id,
            Service.is_active,
        )
    )
    service_obj = result.scalar_one_or_none()
    if not service_obj:
        raise HTTPException(status_code=404, detail="Service not found")

    svc = AvailabilityService(db)
    slots = await svc.get_available_slots(
        current_tenant.id, target_date, service_obj.duration_minutes
    )
    return SlotListResponse(
        date=str(target_date),
        slots=[SlotItem(**s) for s in slots],
    )


@router.get("/overrides", response_model=list[OverrideResponse])
async def get_overrides(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    from_date: date = Query(...),
    to_date: date = Query(...),
):
    svc = AvailabilityService(db)
    overrides = await svc.get_overrides(current_tenant.id, from_date, to_date)
    return [OverrideResponse.model_validate(o) for o in overrides]


@router.post("/overrides", response_model=OverrideResponse, status_code=201)
async def create_override(
    payload: OverrideCreateRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    override = await svc.create_override(current_tenant.id, payload.model_dump())
    return OverrideResponse.model_validate(override)


@router.delete("/overrides/{override_id}", status_code=204)
async def delete_override(
    override_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    svc = AvailabilityService(db)
    try:
        await svc.delete_override(current_tenant.id, override_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Override not found")
