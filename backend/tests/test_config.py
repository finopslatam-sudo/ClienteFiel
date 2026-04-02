from app.core.config import settings


def test_settings_load():
    assert settings.environment in ("development", "test", "production")
    assert "postgresql" in settings.database_url
    assert len(settings.jwt_secret) >= 32
    assert len(settings.encryption_key) >= 32
