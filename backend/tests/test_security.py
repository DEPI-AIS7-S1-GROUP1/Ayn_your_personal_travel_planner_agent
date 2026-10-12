"""Password hashing and login tokens, without HTTP."""

import jwt

from app import config
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_is_bcrypt_and_not_the_password():
    hashed = hash_password("secret123")
    assert hashed.startswith("$2b$12$")  # bcrypt, cost 12
    assert "secret123" not in hashed


def test_same_password_gives_different_hashes_because_of_salt():
    assert hash_password("secret123") != hash_password("secret123")


def test_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("secret124", hashed)
    assert not verify_password("SECRET123", hashed)


def test_verify_rejects_password_over_72_bytes_instead_of_crashing():
    hashed = hash_password("a" * 72)
    assert not verify_password("a" * 73, hashed)


def test_token_round_trip():
    assert decode_access_token(create_access_token("user_abc")) == "user_abc"


def test_token_payload_holds_no_secrets():
    # Signed, not encrypted: anyone can read the payload without the key.
    payload = jwt.decode(create_access_token("user_abc"), options={"verify_signature": False})
    assert set(payload) == {"sub", "iat", "exp"}


def test_expired_token_rejected():
    assert decode_access_token(create_access_token("user_abc", expires_minutes=-1)) is None


def test_tampered_token_rejected():
    # Re-sign the same payload with a different user id but the wrong key.
    forged = jwt.encode({"sub": "user_someone_else", "exp": 9999999999}, "attacker-key-" * 4, algorithm="HS256")
    assert decode_access_token(forged) is None


def test_token_with_edited_payload_rejected():
    header, payload, signature = create_access_token("user_abc").split(".")
    other_payload = create_access_token("user_xyz").split(".")[1]
    assert decode_access_token(f"{header}.{other_payload}.{signature}") is None


def test_unsigned_token_rejected():
    # The classic "alg: none" attack.
    unsigned = jwt.encode({"sub": "user_abc", "exp": 9999999999}, None, algorithm="none")
    assert decode_access_token(unsigned) is None


def test_garbage_token_rejected():
    assert decode_access_token("not-a-token") is None


def test_token_uses_configured_expiry():
    payload = jwt.decode(create_access_token("user_abc"), config.AUTH_SECRET_KEY, algorithms=["HS256"])
    assert payload["exp"] - payload["iat"] == config.AUTH_TOKEN_EXPIRE_MINUTES * 60
