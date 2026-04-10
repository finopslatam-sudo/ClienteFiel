from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    frontend_url: str
    meta_app_id: str
    meta_app_secret: str
    meta_webhook_verify_token: str
    encryption_key: str
    celery_broker_url: str
    celery_result_backend: str
    cookie_domain: str = ""
    mp_access_token: str = ""
    mp_webhook_secret: str = ""
    backend_url: str = "https://api.clientefiel.riava.cl"

    model_config = {"env_file": ".env"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
