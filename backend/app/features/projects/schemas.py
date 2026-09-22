from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


class ProjectCreate(BaseModel):
    name: str
    description: str | None = ""

    @field_validator("description")
    @classmethod
    def description_ok(cls, v: str | None) -> str:
        return v or ""

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("name is required")
        if len(v) > 200:
            raise ValueError("name too long")
        return v


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        if len(v) > 200:
            raise ValueError("name too long")
        return v


class MemberInvite(BaseModel):
    email: EmailStr
    role: Literal["owner", "member"] = "member"


def project_out(p) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description or "",
        "owner_id": str(p.owner_id),
        "created_at": p.created_at,
    }
