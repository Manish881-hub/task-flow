"""Auth controller: parse request, call service, format response."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.features.auth import service as svc
from app.features.auth.schemas import LoginIn, SignupIn, user_out

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

REFRESH_COOKIE = "refresh_token"
REFRESH_PATH = "/api/v1/auth"


def _limit(fn):
    if settings.RATE_LIMIT_ENABLED:
        return limiter.limit("5/minute")(fn)
    return fn


def _set_refresh_cookie(response: Response, token: str) -> None:
    # Secure only in prod (HTTPS). Local dev runs over plain HTTP where
    # Secure cookies would never be sent back, breaking refresh entirely.
    is_prod = settings.ENV.lower() == "prod"
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path=REFRESH_PATH,
        max_age=settings.REFRESH_DAYS * 86400,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)


@router.post("/signup", status_code=201)
@_limit
def signup(request: Request, response: Response, body: Annotated[SignupIn, Body()], db: Session = Depends(get_db)):
    user, refresh, access = svc.signup(db, body.name, body.email, body.password)
    _set_refresh_cookie(response, refresh)
    return {"data": {"user": user_out(user), "access_token": access}}


@router.post("/login")
@_limit
def login(request: Request, response: Response, body: Annotated[LoginIn, Body()], db: Session = Depends(get_db)):
    user, refresh, access = svc.login(db, body.email, body.password)
    _set_refresh_cookie(response, refresh)
    return {"data": {"user": user_out(user), "access_token": access}}


@router.post("/refresh")
@_limit
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE)
    user_id, new_refresh, access = svc.refresh(db, raw)
    _set_refresh_cookie(response, new_refresh)
    return {"data": {"access_token": access, "user_id": str(user_id)}}


@router.post("/logout")
@_limit
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    svc.logout(db, request.cookies.get(REFRESH_COOKIE))
    _clear_refresh_cookie(response)
    return {"data": {"ok": True}}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"data": user_out(user)}
