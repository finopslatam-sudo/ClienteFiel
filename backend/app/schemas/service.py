import uuid
from decimal import Decimal
from pydantic import BaseModel


class ServiceCreateRequest(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int
    price: Decimal


class ServiceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: Decimal
    is_active: bool
    model_config = {"from_attributes": True}
