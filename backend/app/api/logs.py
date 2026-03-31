# backend/app/api/logs.py
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, require_admin
from app.models.tenant import Tenant
from app.models.user import User
from app.models.message_log import MessageLog, MessageLogType, MessageLogStatus

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/messages")
async def list_message_logs(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: MessageLogStatus | None = Query(default=None),
    type: MessageLogType | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
):
    """List message logs with optional filters. Requires admin role."""
    query = select(MessageLog).where(MessageLog.tenant_id == current_tenant.id)

    if status:
        query = query.where(MessageLog.status == status)
    if type:
        query = query.where(MessageLog.type == type)
    if date_from:
        query = query.where(MessageLog.created_at >= date_from)
    if date_to:
        query = query.where(MessageLog.created_at <= date_to)

    query = query.order_by(MessageLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "type": log.type.value,
                "status": log.status.value,
                "provider_message_id": log.provider_message_id,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": len(logs),
    }
