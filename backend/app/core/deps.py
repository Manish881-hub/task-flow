from __future__ import annotations

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db


def _token_from_header(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise UnauthorizedError("Missing bearer token")
    token = auth[len("Bearer "):].strip()
    if not token:
        raise UnauthorizedError("Missing bearer token")
    return token


def get_current_user_id(request: Request) -> str:
    token = _token_from_header(request)
    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid token")


async def get_current_user(request: Request, db: Session = Depends(get_db)):
    from app.db.models import User

    user_id = get_current_user_id(request)
    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("User not found")
    return user
