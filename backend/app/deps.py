"""FastAPI dependencies shared by all routes."""

from collections.abc import Iterator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.errors import ApiError
from app.models import User
from app.security import decode_access_token


def get_db() -> Iterator[Session]:
    """One database session per request, closed when the request ends."""
    with SessionLocal() as session:
        yield session


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """For protected endpoints (Sprint 2): user = Depends(get_current_user).

    Requires "Authorization: Bearer <token>" with a valid, unexpired token for a
    user that still exists. Anything else is 401 UNAUTHORIZED.
    """
    if credentials is None:
        raise ApiError(401, "UNAUTHORIZED", "Missing bearer token.")
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "Invalid or expired token.")
    return user
