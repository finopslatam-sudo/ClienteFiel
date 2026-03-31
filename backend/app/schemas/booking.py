import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.booking import BookingStatus, BookingCreatedBy


class BookingCreateRequest(BaseModel):
    customer_phone: str
    customer_name: str | None = None
    service_id: uuid.UUID
    scheduled_at: datetime


class BookingResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    service_id: uuid.UUID
    scheduled_at: datetime
    status: BookingStatus
    created_by: BookingCreatedBy
    created_at: datetime
    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int
