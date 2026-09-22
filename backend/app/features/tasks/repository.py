"""Tasks repository: data access only."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.db.models import ActivityLog, Comment, Task


def get_task(db: Session, task_id: uuid.UUID) -> Task | None:
    return db.get(Task, task_id)


def create_task(db: Session, **fields) -> Task:
    t = Task(**fields)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def save(db: Session, t: Task) -> Task:
    db.commit()
    db.refresh(t)
    return t


def delete_task(db: Session, t: Task) -> None:
    db.delete(t)
    db.commit()


def list_comments(db: Session, task_id: uuid.UUID) -> list[Comment]:
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at.asc()).all()


def create_comment(db: Session, task_id: uuid.UUID, user_id: uuid.UUID, content: str) -> Comment:
    c = Comment(task_id=task_id, user_id=user_id, content=content)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def log(db: Session, project_id: uuid.UUID, user_id: uuid.UUID, event_type: str, description: str) -> None:
    db.add(ActivityLog(project_id=project_id, user_id=user_id, event_type=event_type, description=description))
    db.commit()
