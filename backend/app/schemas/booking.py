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
    ends_at: datetime | None = None
    status: BookingStatus
    created_by: BookingCreatedBy
    created_at: datetime
    customer_name: str | None = None
    customer_phone: str | None = None
    service_name: str | None = None
    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int
