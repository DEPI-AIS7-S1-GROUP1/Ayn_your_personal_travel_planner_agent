"""Password hashing (bcrypt) and login tokens (JWT)."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app import config

# bcrypt only reads the first 72 bytes of a password; longer ones are rejected
# at signup (app/schemas.py) instead of being silently cut.
MAX_PASSWORD_BYTES = 72
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Returns e.g. "$2b$12$<22-char salt><31-char hash>". The salt is random per call."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_PASSWORD_BYTES:
        return False  # could never have been stored
    return bcrypt.checkpw(password_bytes, password_hash.encode("ascii"))


# Checked against when the email does not exist, so a login for an unknown email
# takes as long as one with a wrong password and response time leaks nothing.
DUMMY_PASSWORD_HASH = hash_password("timing-equaliser-not-a-real-password")


def create_access_token(user_id: str, expires_minutes: int | None = None) -> str:
    """The payload is signed, not encrypted: anyone can read it, so it holds no secrets."""
    now = datetime.now(timezone.utc)
    minutes = config.AUTH_TOKEN_EXPIRE_MINUTES if expires_minutes is None else expires_minutes
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, config.AUTH_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Returns the user id, or None if the token is malformed, tampered with or expired."""
    try:
        payload = jwt.decode(
            token,
            config.AUTH_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
    except jwt.InvalidTokenError:
        return None
    return payload["sub"]
