import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.conversation import Conversation
from app.models.message import Message, MessageDirection, MessageStatus
from app.models.customer import Customer
from app.services.messaging_service import MessagingService

WINDOW_HOURS = 24


class ConversationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def within_window(conversation: Conversation) -> bool:
        if not conversation.last_inbound_at:
            return False
        last_inbound = conversation.last_inbound_at
        if last_inbound.tzinfo is None:
            last_inbound = last_inbound.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - last_inbound) < timedelta(hours=WINDOW_HOURS)

    async def get_or_create_conversation(
        self, tenant_id: uuid.UUID, phone_number: str
    ) -> Conversation:
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.tenant_id == tenant_id,
                Conversation.phone_number == phone_number,
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            return conversation

        customer_result = await self.db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.phone_number == phone_number,
            )
        )
        customer = customer_result.scalar_one_or_none()

        conversation = Conversation(
            tenant_id=tenant_id,
            customer_id=customer.id if customer else None,
            phone_number=phone_number,
        )
        self.db.add(conversation)
        await self.db.flush()
        return conversation

    async def record_inbound_message(
        self, tenant_id: uuid.UUID, phone_number: str, body: str | None, meta_message_id: str
    ) -> Message:
        conversation = await self.get_or_create_conversation(tenant_id, phone_number)
        now = datetime.now(timezone.utc)

        message = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            direction=MessageDirection.inbound,
            body=body,
            status=MessageStatus.received,
            meta_message_id=meta_message_id,
        )
        self.db.add(message)

        conversation.last_message_at = now
        conversation.last_inbound_at = now
        conversation.unread_count += 1

        await self.db.commit()
        return message

    async def update_message_status_by_meta_id(self, meta_message_id: str, status: MessageStatus) -> None:
        await self.db.execute(
            update(Message)
            .where(Message.meta_message_id == meta_message_id)
            .values(status=status)
        )
        await self.db.commit()

    async def list_conversations(
        self, tenant_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[tuple], int]:
        base_query = (
            select(Conversation, Customer.name)
            .outerjoin(Customer, Customer.id == Conversation.customer_id)
            .where(Conversation.tenant_id == tenant_id)
            .order_by(Conversation.last_message_at.desc().nulls_last())
        )
        total_result = await self.db.execute(
            select(Conversation).where(Conversation.tenant_id == tenant_id)
        )
        total = len(total_result.scalars().all())

        result = await self.db.execute(base_query.limit(limit).offset(offset))
        rows = result.all()

        conversations_with_preview = []
        for conversation, customer_name in rows:
            last_message_result = await self.db.execute(
                select(Message.body)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            preview = last_message_result.scalar_one_or_none()
            conversations_with_preview.append((conversation, customer_name, preview))

        return conversations_with_preview, total

    async def get_conversation(self, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> Conversation | None:
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.tenant_id == tenant_id,
                Conversation.id == conversation_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_messages(
        self, tenant_id: uuid.UUID, conversation_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Message], int, bool]:
        conversation = await self.get_conversation(tenant_id, conversation_id)
        if not conversation:
            raise ValueError("conversation_not_found")

        total_result = await self.db.execute(
            select(Message).where(Message.conversation_id == conversation_id)
        )
        total = len(total_result.scalars().all())

        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        messages = list(result.scalars().all())
        return messages, total, self.within_window(conversation)

    async def mark_read(self, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> None:
        conversation = await self.get_conversation(tenant_id, conversation_id)
        if not conversation:
            raise ValueError("conversation_not_found")
        conversation.unread_count = 0
        await self.db.commit()

    async def send_message(
        self,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
        body: str,
        sent_by_user_id: uuid.UUID | None,
    ) -> Message:
        conversation = await self.get_conversation(tenant_id, conversation_id)
        if not conversation:
            raise ValueError("conversation_not_found")
        if not self.within_window(conversation):
            raise ValueError("outside_24h_window")

        result = await MessagingService.send_text_message(
            tenant_id=str(tenant_id),
            phone_number=conversation.phone_number,
            body=body,
        )
        meta_message_id = result.get("messages", [{}])[0].get("id")

        message = Message(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            direction=MessageDirection.outbound,
            body=body,
            status=MessageStatus.pending,
            meta_message_id=meta_message_id,
            sent_by_user_id=sent_by_user_id,
        )
        self.db.add(message)
        conversation.last_message_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(message)
        return message
