"""Projects repository: data access only."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.db.models import ActivityLog, Project, ProjectMember, Task, User


def list_projects_for_user(db: Session, user_id: uuid.UUID):
    return (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == user_id)
        .order_by(Project.created_at.desc())
        .all()
    )


def list_projects_for_user_paginated(db: Session, user_id: uuid.UUID, page: int, per_page: int):
    """Server-side pagination: COUNT + LIMIT/OFFSET in SQL, never slice in Python."""
    from sqlalchemy import func as _func

    base = (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == user_id)
    )
    total = base.with_entities(_func.count(Project.id)).scalar() or 0
    rows = (
        base.order_by(Project.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return rows, int(total)


def get_project(db: Session, project_id: uuid.UUID) -> Project | None:
    return db.get(Project, project_id)


def create_project(db: Session, name: str, description: str, owner_id: uuid.UUID) -> Project:
    p = Project(name=name, description=description or "", owner_id=owner_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_project(db: Session, p: Project, name: str | None, description: str | None) -> Project:
    if name is not None:
        p.name = name
    if description is not None:
        p.description = description
    db.commit()
    db.refresh(p)
    return p


def delete_project(db: Session, p: Project) -> None:
    db.delete(p)
    db.commit()


def get_membership(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> ProjectMember | None:
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )


def list_members(db: Session, project_id: uuid.UUID) -> list[ProjectMember]:
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()


def add_member(db: Session, project_id: uuid.UUID, user_id: uuid.UUID, role: str) -> ProjectMember:
    m = ProjectMember(project_id=project_id, user_id=user_id, role=role)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def remove_member(db: Session, m: ProjectMember) -> None:
    db.delete(m)
    db.commit()


def clear_assignee(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
    db.query(Task).filter(Task.project_id == project_id, Task.assignee_id == user_id).update(
        {Task.assignee_id: None}, synchronize_session=False
    )
    db.commit()


def log_activity(db: Session, project_id: uuid.UUID, user_id: uuid.UUID, event_type: str, description: str) -> ActivityLog:
    row = ActivityLog(project_id=project_id, user_id=user_id, event_type=event_type, description=description)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def task_counts(db: Session, project_id: uuid.UUID) -> dict:
    rows = db.query(Task.status).filter(Task.project_id == project_id).all()
    counts = {"To Do": 0, "In Progress": 0, "Done": 0}
    for (s,) in rows:
        if s in counts:
            counts[s] += 1
    return counts


def get_user(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()
