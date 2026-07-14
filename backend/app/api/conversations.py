import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user
from app.models.tenant import Tenant
from app.models.user import User
from app.services.conversation_service import ConversationService
from app.schemas.conversation import (
    ConversationSummary,
    ConversationListResponse,
    MessageResponse,
    MessageListResponse,
    SendMessageRequest,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    service = ConversationService(db)
    rows, total = await service.list_conversations(current_tenant.id, limit=limit, offset=offset)
    conversations = [
        ConversationSummary(
            id=conversation.id,
            customer_id=conversation.customer_id,
            customer_name=customer_name,
            phone_number=conversation.phone_number,
            last_message_preview=preview,
            last_message_at=conversation.last_message_at,
            last_inbound_at=conversation.last_inbound_at,
            unread_count=conversation.unread_count,
            within_24h_window=service.within_window(conversation),
        )
        for conversation, customer_name, preview in rows
    ]
    return ConversationListResponse(conversations=conversations, total=total)


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    service = ConversationService(db)
    try:
        messages, total, within_window = await service.get_messages(
            current_tenant.id, conversation_id, limit=limit, offset=offset
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return MessageListResponse(
        messages=[MessageResponse.model_validate(m) for m in messages],
        total=total,
        within_24h_window=within_window,
    )


@router.post("/{conversation_id}/read", status_code=204)
async def mark_conversation_read(
    conversation_id: uuid.UUID,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ConversationService(db)
    try:
        await service.mark_read(current_tenant.id, conversation_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Conversation not found")


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=201)
async def send_conversation_message(
    conversation_id: uuid.UUID,
    payload: SendMessageRequest,
    current_tenant: Annotated[Tenant, Depends(get_current_tenant)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ConversationService(db)
    try:
        message = await service.send_message(
            tenant_id=current_tenant.id,
            conversation_id=conversation_id,
            body=payload.body,
            sent_by_user_id=current_user.id,
        )
    except ValueError as e:
        detail = str(e)
        status_code = 404 if detail == "conversation_not_found" else 422
        raise HTTPException(status_code=status_code, detail=detail)

    return MessageResponse.model_validate(message)
