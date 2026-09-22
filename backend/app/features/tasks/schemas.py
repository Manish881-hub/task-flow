from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

STATUSES = ("To Do", "In Progress", "Done")
PRIORITIES = ("Low", "Medium", "High")


class TaskCreate(BaseModel):
    title: str
    description: str | None = ""
    status: Literal["To Do", "In Progress", "Done"] = "To Do"
    priority: Literal["Low", "Medium", "High"] = "Medium"
    due_date: datetime | None = None
    assignee_id: str | None = None

    @field_validator("title")
    @classmethod
    def title_ok(cls, v: str) -> str:
        v = (v or "").strip()
        if not (1 <= len(v) <= 200):
            raise ValueError("title must be 1-200 chars")
        return v

    @field_validator("description")
    @classmethod
    def description_ok(cls, v: str | None) -> str:
        return v or ""


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["To Do", "In Progress", "Done"] | None = None
    priority: Literal["Low", "Medium", "High"] | None = None
    due_date: datetime | None = None
    assignee_id: str | None = None

    @field_validator("title")
    @classmethod
    def title_ok(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not (1 <= len(v) <= 200):
            raise ValueError("title must be 1-200 chars")
        return v


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_ok(cls, v: str) -> str:
        v = (v or "").strip()
        if not (1 <= len(v) <= 2000):
            raise ValueError("content must be 1-2000 chars")
        return v


def task_out(t) -> dict:
    return {
        "id": str(t.id),
        "project_id": str(t.project_id),
        "title": t.title,
        "description": t.description or "",
        "status": t.status,
        "priority": t.priority,
        "due_date": t.due_date,
        "completed_at": t.completed_at,
        "assignee_id": str(t.assignee_id) if t.assignee_id else None,
        "created_by": str(t.created_by) if t.created_by else None,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


def comment_out(c, user=None) -> dict:
    return {
        "id": str(c.id),
        "task_id": str(c.task_id),
        "user_id": str(c.user_id),
        "user_name": user.name if user else None,
        "content": c.content,
        "created_at": c.created_at,
    }
