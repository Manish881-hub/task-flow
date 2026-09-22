"""Auth service: business rules, no HTTP types."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    refresh_expiry,
    verify_password,
)
from app.db.base import ensure_aware
from app.features.auth import repository as repo


def signup(db: Session, name: str, email: str, password: str):
    if repo.get_user_by_email(db, email):
        raise ConflictError("Email already registered")
    return repo.create_user(db, name, email, hash_password(password))


def login(db: Session, email: str, password: str):
    user = repo.get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid credentials")
    token = new_refresh_token()
    repo.create_refresh(db, user.id, hash_token(token), refresh_expiry())
    return user, token, create_access_token(str(user.id))


def refresh(db: Session, raw_token: str | None):
    if not raw_token:
        raise UnauthorizedError("Missing refresh token")
    row = repo.get_refresh_by_hash(db, hash_token(raw_token))
    if row is None or row.revoked:
        raise UnauthorizedError("Invalid refresh token")
    exp = ensure_aware(row.expires_at)
    now = datetime.now(timezone.utc)
    assert exp is not None
    if exp <= now:
        raise UnauthorizedError("Refresh token expired")
    repo.revoke_refresh(db, row)
    new_token = new_refresh_token()
    repo.create_refresh(db, row.user_id, hash_token(new_token), refresh_expiry())
    return row.user_id, new_token, create_access_token(str(row.user_id))


def logout(db: Session, raw_token: str | None) -> None:
    if not raw_token:
        return
    row = repo.get_refresh_by_hash(db, hash_token(raw_token))
    if row is not None and not row.revoked:
        repo.revoke_refresh(db, row)
