# backend/app/core/redis_client.py
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def is_message_processed(meta_message_id: str) -> bool:
    """Idempotencia: retorna True si el mensaje ya fue procesado."""
    redis = await get_redis()
    key = f"wa_msg:{meta_message_id}"
    return await redis.exists(key) == 1


async def mark_message_processed(meta_message_id: str, ttl_seconds: int = 86400) -> None:
    """Marcar mensaje como procesado. TTL default: 24 horas."""
    redis = await get_redis()
    key = f"wa_msg:{meta_message_id}"
    await redis.set(key, "1", ex=ttl_seconds)


async def get_conversation_state(phone_number: str, tenant_id: str) -> dict | None:
    """Estado de conversación WhatsApp para máquina de estados."""
    import json
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    data = await redis.get(key)
    return json.loads(data) if data else None


async def set_conversation_state(
    phone_number: str, tenant_id: str, state: dict, ttl_seconds: int = 1800
) -> None:
    """Guardar estado de conversación con TTL de 30 minutos."""
    import json
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    await redis.set(key, json.dumps(state), ex=ttl_seconds)


async def clear_conversation_state(phone_number: str, tenant_id: str) -> None:
    redis = await get_redis()
    key = f"conv:{phone_number}:{tenant_id}"
    await redis.delete(key)
