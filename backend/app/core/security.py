"""Auth primitives: bcrypt directly, JWT HS256, opaque refresh tokens."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=settings.JWT_EXPIRES_MIN)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> str:
    """Return user_id (sub) or raise jwt exceptions."""
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    sub = payload.get("sub")
    if not sub:
        raise jwt.InvalidTokenError("missing sub")
    return str(sub)


def new_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_DAYS)
