import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.message import MessageDirection, MessageStatus


class ConversationSummary(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID | None = None
    customer_name: str | None = None
    phone_number: str
    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    last_inbound_at: datetime | None = None
    unread_count: int
    within_24h_window: bool


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int


class MessageResponse(BaseModel):
    id: uuid.UUID
    direction: MessageDirection
    body: str | None = None
    status: MessageStatus
    meta_message_id: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int
    within_24h_window: bool


class SendMessageRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4096)
