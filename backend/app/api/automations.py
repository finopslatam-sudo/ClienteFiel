# backend/app/api/automations.py
import uuid
from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant
from app.models.tenant import Tenant, TenantPlan
from app.models.custom_reminder import CustomReminder
from app.models.automation_settings import AutomationSettings
from app.models.campaign import Campaign, CampaignTriggerType

router = APIRouter(prefix="/automations", tags=["automations"])


# ──────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────

class CustomReminderCreate(BaseModel):
    message_text: str
    days_before: int
    time_unit: str = "days"
    service_id: uuid.UUID | None = None
    active: bool = True


class CustomReminderUpdate(BaseModel):
    message_text: str | None = None
    days_before: int | None = None
    time_unit: str | None = None
    service_id: uuid.UUID | None = None
    active: bool | None = None


class CustomReminderResponse(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID | None
    message_text: str
    days_before: int
    time_unit: str
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AutomationSettingsUpdate(BaseModel):
    repurchase_enabled: bool | None = None
    repurchase_days_after: int | None = None
    repurchase_message: str | None = None
    points_enabled: bool | None = None
    points_per_visit: int | None = None
    points_redeem_threshold: int | None = None
    points_reward_description: str | None = None


class AutomationSettingsResponse(BaseModel):
    id: uuid.UUID
    repurchase_enabled: bool
    repurchase_days_after: int
    repurchase_message: str | None
    points_enabled: bool
    points_per_visit: int
    points_redeem_threshold: int
    points_reward_description: str | None

    model_config = {"from_attributes": True}


class CampaignCreate(BaseModel):
    name: str
    message_text: str
    trigger_type: CampaignTriggerType
    trigger_value: int
    active: bool = False


class CampaignUpdate(BaseModel):
    name: str | None = None
    message_text: str | None = None
    trigger_type: CampaignTriggerType | None = None
    trigger_value: int | None = None
    active: bool | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    message_text: str
    trigger_type: str
    trigger_value: int
    active: bool
    last_run_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────
# Helpers de plan-gating
# ──────────────────────────────────────────

def _require_medium_or_above(tenant: Tenant) -> None:
    if tenant.plan not in (TenantPlan.medium, TenantPlan.premium):
        raise HTTPException(status_code=403, detail="Requiere plan Medio o superior")


def _require_premium(tenant: Tenant) -> None:
    if tenant.plan != TenantPlan.premium:
        raise HTTPException(status_code=403, detail="Requiere plan Premium")


# ──────────────────────────────────────────
# Custom Reminders
# ──────────────────────────────────────────

@router.get("/reminders", response_model=list[CustomReminderResponse])
async def list_reminders(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(CustomReminder)
        .where(CustomReminder.tenant_id == current_tenant.id)
        .order_by(CustomReminder.created_at)
    )
    return list(result.scalars().all())


@router.post("/reminders", response_model=CustomReminderResponse, status_code=201)
async def create_reminder(
    payload: CustomReminderCreate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_medium_or_above(current_tenant)
    reminder = CustomReminder(
        tenant_id=current_tenant.id,
        service_id=payload.service_id,
        message_text=payload.message_text,
        days_before=payload.days_before,
        time_unit=payload.time_unit,
        active=payload.active,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.put("/reminders/{reminder_id}", response_model=CustomReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    payload: CustomReminderUpdate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_medium_or_above(current_tenant)
    result = await db.execute(
        select(CustomReminder).where(
            CustomReminder.id == reminder_id,
            CustomReminder.tenant_id == current_tenant.id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(reminder, field, value)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_medium_or_above(current_tenant)
    result = await db.execute(
        select(CustomReminder).where(
            CustomReminder.id == reminder_id,
            CustomReminder.tenant_id == current_tenant.id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    await db.delete(reminder)
    await db.commit()


# ──────────────────────────────────────────
# Automation Settings
# ──────────────────────────────────────────

async def _get_or_create_settings(tenant_id: uuid.UUID, db: AsyncSession) -> AutomationSettings:
    result = await db.execute(
        select(AutomationSettings).where(AutomationSettings.tenant_id == tenant_id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        try:
            settings = AutomationSettings(tenant_id=tenant_id)
            db.add(settings)
            await db.commit()
            await db.refresh(settings)
        except Exception:
            await db.rollback()
            result = await db.execute(
                select(AutomationSettings).where(AutomationSettings.tenant_id == tenant_id)
            )
            settings = result.scalar_one_or_none()
    return settings


@router.get("/settings", response_model=AutomationSettingsResponse)
async def get_settings(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _get_or_create_settings(current_tenant.id, db)


@router.put("/settings", response_model=AutomationSettingsResponse)
async def update_settings(
    payload: AutomationSettingsUpdate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    premium_fields = {
        "repurchase_enabled", "repurchase_days_after", "repurchase_message",
        "points_enabled", "points_per_visit", "points_redeem_threshold",
        "points_reward_description",
    }
    requested = {k for k, v in payload.model_dump(exclude_none=True).items()}
    if requested & premium_fields:
        _require_premium(current_tenant)

    settings = await _get_or_create_settings(current_tenant.id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


# ──────────────────────────────────────────
# Campaigns
# ──────────────────────────────────────────

@router.get("/campaigns", response_model=list[CampaignResponse])
async def list_campaigns(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Campaign)
        .where(Campaign.tenant_id == current_tenant.id)
        .order_by(Campaign.created_at)
    )
    return list(result.scalars().all())


@router.post("/campaigns", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_premium(current_tenant)
    campaign = Campaign(
        tenant_id=current_tenant.id,
        name=payload.name,
        message_text=payload.message_text,
        trigger_type=payload.trigger_type,
        trigger_value=payload.trigger_value,
        active=payload.active,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_premium(current_tenant)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_tenant.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(campaign, field, value)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_premium(current_tenant)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_tenant.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    await db.delete(campaign)
    await db.commit()


@router.patch("/campaigns/{campaign_id}/toggle", response_model=CampaignResponse)
async def toggle_campaign(
    campaign_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _require_premium(current_tenant)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_tenant.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    campaign.active = not campaign.active
    await db.commit()
    await db.refresh(campaign)
    return campaign
