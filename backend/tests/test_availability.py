import pytest
from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking


def test_models_importable():
    assert AvailabilityRule.__tablename__ == "availability_rules"
    assert AvailabilityOverride.__tablename__ == "availability_overrides"
    assert hasattr(Booking, "ends_at")


from datetime import time
from app.schemas.availability import AvailabilityRuleCreate, WeeklyScheduleRequest


def test_rule_create_validates_day_of_week():
    with pytest.raises(Exception):
        AvailabilityRuleCreate(
            day_of_week=7,
            start_time=time(9, 0),
            end_time=time(18, 0),
        )


def test_rule_create_valid():
    rule = AvailabilityRuleCreate(
        day_of_week=0,
        start_time=time(9, 0),
        end_time=time(18, 0),
    )
    assert rule.slot_duration_minutes == 30
    assert rule.timezone == "America/Santiago"


def test_rule_end_before_start_rejected():
    with pytest.raises(Exception):
        AvailabilityRuleCreate(
            day_of_week=0,
            start_time=time(18, 0),
            end_time=time(9, 0),
        )
