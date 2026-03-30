from app.core.config import settings


def test_settings_load():
    assert settings.environment == "development"
    assert settings.database_url.startswith("postgresql://")
    assert len(settings.jwt_secret) >= 32
    assert len(settings.encryption_key) >= 32
