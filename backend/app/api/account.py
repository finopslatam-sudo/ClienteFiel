from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_tenant
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.account import AccountResponse, AccountUpdateRequest

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=AccountResponse)
async def get_account(
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
):
    return AccountResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        company_name=current_tenant.name,
    )


@router.put("/me", response_model=AccountResponse)
async def update_account(
    payload: AccountUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    current_user.first_name = payload.first_name
    current_user.last_name = payload.last_name
    current_tenant.name = payload.company_name
    await db.commit()
    await db.refresh(current_user)
    await db.refresh(current_tenant)
    return AccountResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        company_name=current_tenant.name,
    )