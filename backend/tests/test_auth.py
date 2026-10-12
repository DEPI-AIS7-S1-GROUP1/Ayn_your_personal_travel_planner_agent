"""POST /api/signup, POST /api/login and the get_current_user dependency."""

import os
import re
import subprocess
import sys
from pathlib import Path

import bcrypt
import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.deps import get_current_user, get_db
from app.errors import register_error_handlers
from app.models import User
from app.security import create_access_token, decode_access_token

BACKEND_DIR = Path(__file__).resolve().parents[1]
SARA = {"email": "sara@example.com", "password": "secret123"}


def signup(client, **overrides):
    return client.post("/api/signup", json={**SARA, **overrides})


def login(client, **overrides):
    return client.post("/api/login", json={**SARA, **overrides})


def assert_error(response, status, code):
    assert response.status_code == status, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert body["error"]["message"]


# --- signup -------------------------------------------------------------------

def test_signup_returns_user_and_token(client):
    response = signup(client)
    assert response.status_code == 201
    body = response.json()

    assert set(body) == {"user", "token"}
    assert set(body["user"]) == {"id", "email", "created_at"}
    assert re.match(r"^user_[0-9a-f]{16}$", body["user"]["id"])
    assert body["user"]["email"] == "sara@example.com"
    assert re.match(r"^\d{4}-\d{2}-\d{2}$", body["user"]["created_at"])
    # The token logs the new user in straight away.
    assert decode_access_token(body["token"]) == body["user"]["id"]


def test_signup_never_returns_the_password(client):
    text_body = signup(client).text
    assert "secret123" not in text_body
    assert "password" not in text_body


def test_signup_persists_the_user(client, session):
    user_id = signup(client).json()["user"]["id"]
    user = session.get(User, user_id)
    assert user is not None and user.email == "sara@example.com"


def test_database_never_contains_the_plaintext_password(client, session):
    signup(client)
    # Look at every column of every row, as someone with a copy of the database would.
    for row in session.execute(text("SELECT * FROM users")):
        assert all("secret123" not in str(value) for value in row)

    stored = session.scalar(select(User.password_hash))
    assert stored.startswith("$2b$12$")
    assert bcrypt.checkpw(b"secret123", stored.encode())


def test_signup_normalises_email(client):
    response = signup(client, email="  Sara@Example.COM ")
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "sara@example.com"


def test_duplicate_email_rejected(client):
    signup(client)
    assert_error(signup(client), 409, "EMAIL_TAKEN")


def test_duplicate_email_with_different_case_rejected(client):
    signup(client)
    assert_error(signup(client, email="SARA@example.com"), 409, "EMAIL_TAKEN")


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "sara@example.com", "password": "short"},  # under 8 characters
        {"email": "not-an-email", "password": "secret123"},
        {"email": "sara@@example.com", "password": "secret123"},
        {"email": "sara@example..com", "password": "secret123"},
        {"email": "sara@example.com"},  # password missing
        {"password": "secret123"},  # email missing
        {"email": "sara@example.com", "password": "a" * 73},  # 73 bytes
        {"email": "sara@example.com", "password": "س" * 37},  # 37 characters, 74 bytes
    ],
    ids=["short-password", "no-at-sign", "double-at", "double-dot", "no-password", "no-email",
         "73-ascii-bytes", "37-arabic-chars-74-bytes"],
)
def test_invalid_signup_rejected_with_400(client, session, payload):
    response = client.post("/api/signup", json=payload)
    assert_error(response, 400, "VALIDATION_ERROR")
    # The submitted password is never echoed back in the error message.
    if "password" in payload:
        assert payload["password"] not in response.text
    assert session.scalar(select(User.id)) is None  # nothing saved


def test_password_of_exactly_72_bytes_accepted(client):
    assert signup(client, password="a" * 72).status_code == 201
    assert login(client, password="a" * 72).status_code == 200


def test_non_json_body_rejected_with_400(client):
    response = client.post("/api/signup", content="email=sara", headers={"Content-Type": "text/plain"})
    assert_error(response, 400, "VALIDATION_ERROR")


# --- login --------------------------------------------------------------------

def test_login_with_correct_password(client):
    user_id = signup(client).json()["user"]["id"]
    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["user"] == {"id": user_id, "email": "sara@example.com", "created_at": body["user"]["created_at"]}
    assert decode_access_token(body["token"]) == user_id
    assert "secret123" not in response.text


def test_login_email_is_case_insensitive(client):
    signup(client)
    assert login(client, email=" SARA@example.com").status_code == 200


def test_login_wrong_password_rejected(client):
    signup(client)
    assert_error(login(client, password="secret124"), 401, "INVALID_CREDENTIALS")


def test_unknown_email_gets_the_same_answer_as_wrong_password(client):
    signup(client)
    wrong_password = login(client, password="secret124")
    unknown_email = login(client, email="nobody@example.com")
    assert unknown_email.status_code == wrong_password.status_code == 401
    assert unknown_email.json() == wrong_password.json()


@pytest.mark.parametrize("payload", [
    {"email": "not-an-email", "password": "secret123"},
    {"email": "sara@example.com", "password": "short"},
    {"email": "sara@example.com", "password": "a" * 100},
])
def test_login_with_malformed_input_is_401_not_400(client, payload):
    # The contract's only login error is 401 INVALID_CREDENTIALS.
    signup(client)
    assert_error(client.post("/api/login", json=payload), 401, "INVALID_CREDENTIALS")


# --- get_current_user (used by the protected endpoints in Sprint 2) -----------

@pytest.fixture
def protected_client(engine):
    """A tiny app with one protected route, to test the dependency on its own
    without adding an endpoint that is not in the contract to the real app."""
    from sqlalchemy.orm import sessionmaker

    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.get("/whoami")
    def whoami(user: User = Depends(get_current_user)):
        return {"id": user.id}

    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        with TestSession() as session:
            yield session

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


def test_valid_token_identifies_the_user(client, protected_client):
    body = signup(client).json()
    response = protected_client.get("/whoami", headers={"Authorization": f"Bearer {body['token']}"})
    assert response.status_code == 200
    assert response.json() == {"id": body["user"]["id"]}


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-token"},
        {"Authorization": "Basic c2FyYTpzZWNyZXQxMjM="},
        {"Authorization": "Bearer " + create_access_token("user_abc", expires_minutes=-1)},
    ],
    ids=["no-header", "garbage-token", "wrong-scheme", "expired-token"],
)
def test_missing_or_invalid_token_is_401(protected_client, headers):
    assert_error(protected_client.get("/whoami", headers=headers), 401, "UNAUTHORIZED")


def test_expired_token_of_existing_user_is_401(client, protected_client):
    # The user exists, so only the expiry check can reject this.
    user_id = signup(client).json()["user"]["id"]
    expired = create_access_token(user_id, expires_minutes=-1)
    response = protected_client.get("/whoami", headers={"Authorization": f"Bearer {expired}"})
    assert_error(response, 401, "UNAUTHORIZED")


def test_forged_token_of_existing_user_is_401(client, protected_client):
    # Correct user id and a valid expiry, but signed with someone else's key.
    user_id = signup(client).json()["user"]["id"]
    forged = jwt.encode({"sub": user_id, "exp": 9999999999}, "attacker-key-" * 4, algorithm="HS256")
    response = protected_client.get("/whoami", headers={"Authorization": f"Bearer {forged}"})
    assert_error(response, 401, "UNAUTHORIZED")


def test_token_of_deleted_user_is_401(client, protected_client, session):
    body = signup(client).json()
    session.delete(session.get(User, body["user"]["id"]))
    session.commit()
    response = protected_client.get("/whoami", headers={"Authorization": f"Bearer {body['token']}"})
    assert_error(response, 401, "UNAUTHORIZED")


# --- app configuration --------------------------------------------------------

def test_cors_allows_the_frontend_origin_only(client):
    preflight = {"Access-Control-Request-Method": "POST"}
    allowed = client.options("/api/signup", headers={**preflight, "Origin": "http://localhost:3000"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"

    other = client.options("/api/signup", headers={**preflight, "Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


@pytest.mark.parametrize("secret", ["", "too-short"])
def test_app_refuses_to_start_without_a_strong_secret(secret):
    env = {**os.environ, "AUTH_SECRET_KEY": secret, "DATABASE_URL": "sqlite://"}
    result = subprocess.run(
        [sys.executable, "-c", "import app.main"],
        cwd=BACKEND_DIR, env=env, capture_output=True, text=True,
    )
    assert result.returncode != 0
    assert "AUTH_SECRET_KEY is missing or shorter than 32 characters" in result.stderr
