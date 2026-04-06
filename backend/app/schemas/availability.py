import uuid
from datetime import date, time
from pydantic import BaseModel, field_validator, model_validator


class AvailabilityRuleCreate(BaseModel):
    day_of_week: int  # 0=Mon, 6=Sun
    start_time: time
    end_time: time
    slot_duration_minutes: int = 30
    buffer_minutes: int = 0
    max_bookings_per_day: int | None = None
    is_active: bool = True
    timezone: str = "America/Santiago"

    @field_validator("day_of_week")
    @classmethod
    def validate_dow(cls, v: int) -> int:
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0–6 (Monday=0, Sunday=6)")
        return v

    @model_validator(mode="after")
    def validate_time_range(self) -> "AvailabilityRuleCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityRuleResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    buffer_minutes: int
    max_bookings_per_day: int | None
    is_active: bool
    timezone: str
    model_config = {"from_attributes": True}


class WeeklyScheduleRequest(BaseModel):
    rules: list[AvailabilityRuleCreate]


class WeeklyScheduleResponse(BaseModel):
    rules: list[AvailabilityRuleResponse]


class OverrideCreateRequest(BaseModel):
    override_date: date
    is_closed: bool = False
    custom_start_time: time | None = None
    custom_end_time: time | None = None
    reason: str | None = None


class OverrideResponse(BaseModel):
    id: uuid.UUID
    override_date: date
    is_closed: bool
    custom_start_time: time | None
    custom_end_time: time | None
    reason: str | None
    model_config = {"from_attributes": True}


class SlotItem(BaseModel):
    start: str  # ISO8601 with timezone offset
    end: str
    available: bool


class SlotListResponse(BaseModel):
    date: str
    slots: list[SlotItem]
