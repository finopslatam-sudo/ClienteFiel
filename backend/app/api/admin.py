# backend/app/api/admin.py
import uuid
import secrets
import logging
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.security import create_access_token, hash_password, verify_password
from app.models.superadmin import SuperAdminUser
from app.models.tenant import Tenant, TenantPlan
from app.models.user import User
from app.models.subscription import Subscription
from app.models.whatsapp import WhatsappConnection
from app.models.billing_profile import BillingProfile
from app.schemas.admin import (
    AdminLoginRequest, AdminTokenResponse, AdminMetricsResponse,
    TenantSummary, TenantDetail, TenantSubscriptionInfo, UserInfo,
    BillingInfo, WhatsAppCredentialInfo, ChangePlanRequest,
    ChangeAdminPasswordRequest, ResetTenantUserPasswordRequest, ResetPasswordResponse,
    UpdateTenantUserRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_login(
    payload: AdminLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(SuperAdminUser).where(SuperAdminUser.email == payload.email)
    )
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(admin.id),
        "superadmin": True,
    })
    logger.info({"event": "admin.login", "admin_id": str(admin.id)})
    return AdminTokenResponse(access_token=token)


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    total = (await db.execute(select(func.count(Tenant.id)))).scalar() or 0

    status_rows = (await db.execute(
        select(Tenant.status, func.count(Tenant.id)).group_by(Tenant.status)
    )).all()
    by_status = {row[0].value: row[1] for row in status_rows}

    plan_rows = (await db.execute(
        select(Tenant.plan, func.count(Tenant.id)).group_by(Tenant.plan)
    )).all()
    by_plan = {row[0].value: row[1] for row in plan_rows}

    wa_count = (await db.execute(
        select(func.count(WhatsappConnection.id)).where(WhatsappConnection.is_active == True)  # noqa: E712
    )).scalar() or 0

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_count = (await db.execute(
        select(func.count(Tenant.id)).where(Tenant.created_at >= first_of_month)
    )).scalar() or 0

    return AdminMetricsResponse(
        total_tenants=total,
        by_status=by_status,
        by_plan=by_plan,
        whatsapp_connected=wa_count,
        new_this_month=new_count,
    )


@router.get("/tenants", response_model=list[TenantSummary])
async def list_tenants(
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str = Query(default="", max_length=100),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
):
    # Identify tenants owned by superadmins (to flag them, not exclude)
    admin_emails = (await db.execute(select(SuperAdminUser.email))).scalars().all()
    superadmin_tenant_ids: set[uuid.UUID] = set()
    if admin_emails:
        rows = (await db.execute(
            select(User.tenant_id).where(User.email.in_(admin_emails))
        )).scalars().all()
        superadmin_tenant_ids = set(rows)

    query = select(Tenant).order_by(Tenant.created_at.desc()).offset(offset).limit(limit)
    if search:
        query = query.where(Tenant.name.ilike(f"%{search}%"))

    tenants = (await db.execute(query)).scalars().all()
    result = []

    for tenant in tenants:
        user_count = (await db.execute(
            select(func.count(User.id)).where(User.tenant_id == tenant.id)
        )).scalar() or 0

        wa = (await db.execute(
            select(WhatsappConnection).where(
                WhatsappConnection.tenant_id == tenant.id,
                WhatsappConnection.is_active == True,  # noqa: E712
            )
        )).scalar_one_or_none()

        sub_row = (await db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant.id)
        )).scalar_one_or_none()
        sub_info = TenantSubscriptionInfo(
            plan=sub_row.plan.value,
            status=sub_row.status.value,
            provider=sub_row.provider.value,
            external_subscription_id=sub_row.external_subscription_id,
        ) if sub_row else None

        result.append(TenantSummary(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            plan=tenant.plan.value,
            status=tenant.status.value,
            trial_ends_at=tenant.trial_ends_at,
            created_at=tenant.created_at,
            user_count=user_count,
            whatsapp_connected=wa is not None,
            subscription=sub_info,
            is_superadmin_tenant=tenant.id in superadmin_tenant_ids,
        ))

    return result


@router.get("/tenants/{tenant_id}", response_model=TenantDetail)
async def get_tenant(
    tenant_id: uuid.UUID,
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    tenant = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    users = (await db.execute(select(User).where(User.tenant_id == tenant_id))).scalars().all()
    sub_row = (await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))).scalar_one_or_none()
    billing_row = (await db.execute(select(BillingProfile).where(BillingProfile.tenant_id == tenant_id))).scalar_one_or_none()
    wa_row = (await db.execute(select(WhatsappConnection).where(WhatsappConnection.tenant_id == tenant_id))).scalar_one_or_none()

    return TenantDetail(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan.value,
        status=tenant.status.value,
        trial_ends_at=tenant.trial_ends_at,
        created_at=tenant.created_at,
        subscription=TenantSubscriptionInfo(
            plan=sub_row.plan.value,
            status=sub_row.status.value,
            provider=sub_row.provider.value,
            external_subscription_id=sub_row.external_subscription_id,
        ) if sub_row else None,
        users=[
            UserInfo(
                id=u.id, email=u.email, first_name=u.first_name,
                last_name=u.last_name, role=u.role.value,
                is_active=u.is_active, created_at=u.created_at,
            ) for u in users
        ],
        billing=BillingInfo(
            document_type=billing_row.document_type.value,
            person_first_name=billing_row.person_first_name,
            person_last_name=billing_row.person_last_name,
            person_email=billing_row.person_email,
            person_rut=billing_row.person_rut,
            company_name=billing_row.company_name,
            company_razon_social=billing_row.company_razon_social,
            company_rut=billing_row.company_rut,
            company_giro=billing_row.company_giro,
            company_address=billing_row.company_address,
        ) if billing_row else None,
        whatsapp=WhatsAppCredentialInfo(
            phone_number=wa_row.phone_number,
            phone_number_id=wa_row.phone_number_id,
            meta_waba_id=wa_row.meta_waba_id,
            is_active=wa_row.is_active,
            verified_at=wa_row.verified_at,
            token_expires_at=wa_row.token_expires_at,
        ) if wa_row else None,
    )


@router.put("/tenants/{tenant_id}/plan", response_model=TenantSummary)
async def change_tenant_plan(
    tenant_id: uuid.UUID,
    payload: ChangePlanRequest,
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        new_plan = TenantPlan(payload.plan)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid plan: {payload.plan}")

    tenant = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.plan = new_plan

    sub_row = (await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))).scalar_one_or_none()
    if sub_row:
        sub_row.plan = new_plan

    await db.commit()

    logger.info({
        "event": "admin.plan_changed",
        "tenant_id": str(tenant_id),
        "new_plan": new_plan.value,
    })

    user_count = (await db.execute(select(func.count(User.id)).where(User.tenant_id == tenant_id))).scalar() or 0
    wa = (await db.execute(
        select(WhatsappConnection).where(
            WhatsappConnection.tenant_id == tenant_id,
            WhatsappConnection.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()

    return TenantSummary(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan.value,
        status=tenant.status.value,
        trial_ends_at=tenant.trial_ends_at,
        created_at=tenant.created_at,
        user_count=user_count,
        whatsapp_connected=wa is not None,
        subscription=TenantSubscriptionInfo(
            plan=sub_row.plan.value,
            status=sub_row.status.value,
            provider=sub_row.provider.value,
            external_subscription_id=sub_row.external_subscription_id,
        ) if sub_row else None,
    )


@router.put("/auth/password", status_code=204)
async def change_admin_password(
    payload: ChangeAdminPasswordRequest,
    admin: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    admin.password_hash = hash_password(payload.new_password)
    await db.commit()
    logger.info({"event": "admin.password_changed", "admin_id": str(admin.id)})


@router.post("/tenants/{tenant_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_tenant_user_password(
    tenant_id: uuid.UUID,
    payload: ResetTenantUserPasswordRequest,
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = (await db.execute(
        select(User).where(User.id == payload.user_id, User.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en este tenant")

    temp_password = secrets.token_urlsafe(12)
    user.password_hash = hash_password(temp_password)
    await db.commit()
    logger.info({"event": "admin.tenant_password_reset", "tenant_id": str(tenant_id), "user_id": str(user.id)})
    return ResetPasswordResponse(temporary_password=temp_password)


@router.put("/tenants/{tenant_id}/users/{user_id}", response_model=UserInfo)
async def update_tenant_user(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateTenantUserRequest,
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = (await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.email is not None:
        user.email = payload.email

    await db.commit()
    logger.info({"event": "admin.user_updated", "tenant_id": str(tenant_id), "user_id": str(user_id)})
    return UserInfo(
        id=user.id, email=user.email, first_name=user.first_name,
        last_name=user.last_name, role=user.role.value,
        is_active=user.is_active, created_at=user.created_at,
    )


@router.get("/tenants/{tenant_id}/credentials", response_model=WhatsAppCredentialInfo | None)
async def get_tenant_credentials(
    tenant_id: uuid.UUID,
    _: Annotated[SuperAdminUser, Depends(get_current_superadmin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retorna metadatos de WhatsApp del tenant. NUNCA expone access_token."""
    wa = (await db.execute(
        select(WhatsappConnection).where(WhatsappConnection.tenant_id == tenant_id)
    )).scalar_one_or_none()

    if not wa:
        return None

    return WhatsAppCredentialInfo(
        phone_number=wa.phone_number,
        phone_number_id=wa.phone_number_id,
        meta_waba_id=wa.meta_waba_id,
        is_active=wa.is_active,
        verified_at=wa.verified_at,
        token_expires_at=wa.token_expires_at,
    )
