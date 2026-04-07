# backend/app/api/tenant.py
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant

router = APIRouter(prefix="/tenant", tags=["tenant"])


class TenantProfileResponse(BaseModel):
    name: str
    slug: str
    timezone: str
    plan: str
    status: str
    model_config = {"from_attributes": True}


class TenantProfileUpdate(BaseModel):
    name: str | None = None
    timezone: str | None = None


@router.get("/profile", response_model=TenantProfileResponse)
async def get_profile(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
):
    return TenantProfileResponse.model_validate(current_tenant)


@router.patch("/profile", response_model=TenantProfileResponse)
async def update_profile(
    payload: TenantProfileUpdate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if payload.name is not None:
        current_tenant.name = payload.name.strip()
    if payload.timezone is not None:
        current_tenant.timezone = payload.timezone
    await db.commit()
    await db.refresh(current_tenant)
    return TenantProfileResponse.model_validate(current_tenant)
