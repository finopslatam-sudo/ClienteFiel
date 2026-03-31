# backend/app/api/auth.py
from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RegisterResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    payload: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    try:
        user, tenant = await service.register(
            payload.business_name, payload.email, payload.password
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    access_token = create_access_token({
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role.value,
    })
    return RegisterResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = AuthService(db)
    try:
        user = await service.authenticate(payload.email, payload.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role.value,
    })
    refresh_token = create_access_token(
        {"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
    )
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(current_user)
