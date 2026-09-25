"""Projects service: business rules, no HTTP types."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.features.projects import repository as repo


def _pid(project_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")


def require_membership(db: Session, project_id: uuid.UUID, user_id: uuid.UUID):
    m = repo.get_membership(db, project_id, user_id)
    if m is None:
        raise ForbiddenError("Not a project member")
    return m


def require_owner(db: Session, project_id: uuid.UUID, user_id: uuid.UUID):
    m = require_membership(db, project_id, user_id)
    if m.role != "owner":
        raise ForbiddenError("Owner only")
    return m


def create_project(db: Session, user_id: uuid.UUID, name: str, description: str):
    # One transaction: validate nothing (creation has no preconditions), mutate
    # everything, commit once — a project is never left without its owner.
    try:
        p = repo.create_project(db, name, description, user_id)
        repo.add_member(db, p.id, user_id, "owner")
        repo.log_activity(db, p.id, user_id, "project_created", f"Project '{name}' created")
        db.commit()
    except Exception:
        db.rollback()
        raise
    return p


def invite_member(db: Session, project_id: str, inviter_id: uuid.UUID, email: str, role: str):
    pid = _pid(project_id)
    project = repo.get_project(db, pid)
    if project is None:
        raise NotFoundError("Project")
    require_owner(db, pid, inviter_id)
    if role not in ("owner", "member"):
        raise ValidationError("Invalid role")
    user = repo.get_user_by_email(db, email)
    if user is None:
        raise NotFoundError("User")
    if repo.get_membership(db, pid, user.id):
        raise ValidationError("User already a member")
    try:
        m = repo.add_member(db, pid, user.id, role)
        repo.log_activity(db, pid, inviter_id, "member_invited", f"{user.email} invited as {role}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    return user, m


def remove_member(db: Session, project_id: str, actor_id: uuid.UUID, target_user_id: str):
    pid = _pid(project_id)
    try:
        tid = uuid.UUID(str(target_user_id))
    except ValueError:
        raise NotFoundError("Member")
    project = repo.get_project(db, pid)
    if project is None:
        raise NotFoundError("Project")
    require_owner(db, pid, actor_id)
    m = repo.get_membership(db, pid, tid)
    if m is None:
        raise NotFoundError("Member")
    if m.role == "owner":
        raise ValidationError("Cannot remove owner")
    # One transaction: unassign + remove + audit together, so a crash can
    # never leave "assignee cleared but still a member" (or the reverse).
    try:
        repo.clear_assignee(db, pid, tid)
        repo.remove_member(db, m)
        repo.log_activity(db, pid, actor_id, "member_removed", f"Member {target_user_id} removed")
        db.commit()
    except Exception:
        db.rollback()
        raise
