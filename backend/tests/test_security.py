# backend/tests/test_security.py
import pytest
from datetime import timedelta
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    encrypt_token,
    decrypt_token,
)


def test_hash_and_verify_password():
    hashed = hash_password("mypassword123")
    assert hashed != "mypassword123"
    assert verify_password("mypassword123", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_access_token():
    data = {"sub": "user-uuid-123", "tenant_id": "tenant-uuid-456", "role": "admin"}
    token = create_access_token(data, expires_delta=timedelta(minutes=30))
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["tenant_id"] == "tenant-uuid-456"
    assert decoded["role"] == "admin"


def test_decode_invalid_token_raises():
    with pytest.raises(Exception):
        decode_access_token("invalid.token.here")


def test_encrypt_and_decrypt_token():
    original = "my-whatsapp-access-token-12345"
    encrypted = encrypt_token(original)
    assert encrypted != original.encode()
    decrypted = decrypt_token(encrypted)
    assert decrypted == original


def test_encrypt_produces_different_output_each_time():
    token = "same-token"
    enc1 = encrypt_token(token)
    enc2 = encrypt_token(token)
    # Fernet usa IV aleatorio — cada cifrado es diferente
    assert enc1 != enc2
    # Pero ambos descifran al mismo valor
    assert decrypt_token(enc1) == decrypt_token(enc2) == token
