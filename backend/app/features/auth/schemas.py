from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("password must be at least 8 characters")
    if len(v.encode("utf-8")) > 72:
        raise ValueError("password must be at most 72 bytes")
    if not any(c.isalpha() for c in v):
        raise ValueError("password must contain at least one letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("password must contain at least one digit")
    return v


class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name is required")
        return v

    @field_validator("password")
    @classmethod
    def pw_ok(cls, v: str) -> str:
        return _validate_password(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime


class LoginData(BaseModel):
    user: UserOut
    access_token: str


def user_out(user) -> dict:
    return {"id": str(user.id), "name": user.name, "email": user.email, "created_at": user.created_at}
