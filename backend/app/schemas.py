"""Request and response shapes (docs/api-contract.md sections 3.1 and 4)."""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import User
from app.security import MAX_PASSWORD_BYTES


def _normalise_email(value: str) -> str:
    # "Sara@Example.com " and "sara@example.com" are the same account.
    return value.strip().lower()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        return _normalise_email(value)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes")
        return value


class LoginRequest(BaseModel):
    # No format rules here: the contract's only login error is 401
    # INVALID_CREDENTIALS, so a malformed email simply matches no account.
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalise(cls, value: str) -> str:
        return _normalise_email(value)


class UserOut(BaseModel):
    """Public user. There is no password field, so it can never be returned."""

    id: str
    email: str
    created_at: str  # YYYY-MM-DD

    @classmethod
    def from_model(cls, user: User) -> "UserOut":
        return cls(id=user.id, email=user.email, created_at=user.created_at.date().isoformat())


class AuthResponse(BaseModel):
    user: UserOut
    token: str
