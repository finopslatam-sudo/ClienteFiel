from app.models.availability import AvailabilityRule, AvailabilityOverride
from app.models.booking import Booking


def test_models_importable():
    assert AvailabilityRule.__tablename__ == "availability_rules"
    assert AvailabilityOverride.__tablename__ == "availability_overrides"
    assert hasattr(Booking, "ends_at")
