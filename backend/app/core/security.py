# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        raise ValueError("Invalid token") from e


def _get_fernet() -> Fernet:
    import hashlib
    import base64
    # Deriving 32 bytes via SHA-256 preserves all key entropy regardless of length
    key_bytes = hashlib.sha256(settings.encryption_key.encode()).digest()
    encoded = base64.urlsafe_b64encode(key_bytes)
    return Fernet(encoded)


def encrypt_token(token: str) -> bytes:
    """Cifrar access_token de WhatsApp antes de guardar en DB."""
    return _get_fernet().encrypt(token.encode())


def decrypt_token(encrypted: bytes) -> str:
    """Descifrar access_token de WhatsApp solo en memoria al momento de uso."""
    return _get_fernet().decrypt(encrypted).decode()
