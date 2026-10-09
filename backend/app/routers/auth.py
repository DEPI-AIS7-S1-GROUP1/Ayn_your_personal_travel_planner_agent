"""POST /api/signup and POST /api/login (docs/api-contract.md section 4)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import ApiError
from app.models import User
from app.schemas import AuthResponse, LoginRequest, SignupRequest, UserOut
from app.security import DUMMY_PASSWORD_HASH, create_access_token, hash_password, verify_password

router = APIRouter(tags=["auth"])


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(user=UserOut.from_model(user), token=create_access_token(user.id))


def _email_taken() -> ApiError:
    return ApiError(409, "EMAIL_TAKEN", "An account with that email already exists.")


@router.post("/signup", status_code=201, response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if db.scalar(select(User.id).where(User.email == body.email)) is not None:
        raise _email_taken()

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two signups with the same email at the same moment: the UNIQUE constraint decides.
        db.rollback()
        raise _email_taken()
    db.refresh(user)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == body.email))
    if user is None:
        verify_password(body.password, DUMMY_PASSWORD_HASH)  # same timing as a wrong password
        password_ok = False
    else:
        password_ok = verify_password(body.password, user.password_hash)

    # Same answer for "no such email" and "wrong password": never reveal which emails exist.
    if not password_ok:
        raise ApiError(401, "INVALID_CREDENTIALS", "Wrong email or password.")
    return _auth_response(user)
