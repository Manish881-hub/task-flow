"""Tasks service: business rules, no HTTP types."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.db.base import ensure_aware, utcnow
from app.db.models import ProjectMember, Task
from app.features.projects import repository as prepo
from app.features.tasks import repository as repo


def _uuid(val: str, resource: str = "Resource") -> uuid.UUID:
    try:
        return uuid.UUID(str(val))
    except ValueError:
        raise NotFoundError(resource)


def _check_due(due: datetime | None) -> None:
    if due is None:
        return
    aware = ensure_aware(due)
    assert aware is not None
    today = datetime.now(timezone.utc).date()
    if aware.date() < today:
        raise ValidationError("due_date cannot be in the past")


def _check_assignee(db: Session, pid: uuid.UUID, assignee: str | None) -> uuid.UUID | None:
    if assignee is None:
        return None
    aid = _uuid(assignee, "Assignee")
    m = db.query(ProjectMember).filter(
        ProjectMember.project_id == pid, ProjectMember.user_id == aid
    ).first()
    if m is None:
        raise ValidationError("Assignee must be a project member")
    return aid


def _require_member(db: Session, pid: uuid.UUID, uid: uuid.UUID):
    m = prepo.get_membership(db, pid, uid)
    if m is None:
        raise ForbiddenError("Not a project member")
    return m


def _get_scoped_task(db: Session, pid: uuid.UUID, tid: uuid.UUID) -> Task:
    t = repo.get_task(db, tid)
    if t is None or t.project_id != pid:
        raise NotFoundError("Task")
    return t


def create_task(db: Session, pid: str, uid: uuid.UUID, data: dict) -> Task:
    pid_u = _uuid(pid, "Project")
    if prepo.get_project(db, pid_u) is None:
        raise NotFoundError("Project")
    membership = _require_member(db, pid_u, uid)
    _check_due(data.get("due_date"))
    aid = _check_assignee(db, pid_u, data.get("assignee_id"))
    # Done rule applies on creation too: only the assignee (or owner)
    # may create a task straight into Done. Otherwise any member could
    # bypass the update-path check by choosing status=Done up front.
    if (data.get("status") or "To Do") == "Done":
        is_assignee = aid is not None and aid == uid
        if not is_assignee and membership.role != "owner":
            raise ForbiddenError("Only assignee or owner can mark Done")
    t = repo.create_task(
        db,
        project_id=pid_u,
        title=data["title"],
        description=data.get("description") or "",
        status=data.get("status") or "To Do",
        priority=data.get("priority") or "Medium",
        due_date=data.get("due_date"),
        assignee_id=aid,
        created_by=uid,
        completed_at=utcnow() if (data.get("status") == "Done") else None,
    )
    repo.log(db, pid_u, uid, "task_created", f"Task '{t.title}' created")
    return t


def update_task(db: Session, pid: str, tid: str, uid: uuid.UUID, data: dict) -> Task:
    pid_u = _uuid(pid, "Project")
    tid_u = _uuid(tid, "Task")
    t = _get_scoped_task(db, pid_u, tid_u)
    membership = _require_member(db, pid_u, uid)
    new_status = data.get("status", t.status)
    # Done rule: only assignee or owner can set Done
    if new_status == "Done" and t.status != "Done":
        is_assignee = t.assignee_id is not None and uuid.UUID(str(t.assignee_id)) == uid
        # also allow if the update itself assigns to current user? check target assignee
        target_assignee = data.get("assignee_id", str(t.assignee_id) if t.assignee_id else None)
        if target_assignee is not None:
            try:
                if uuid.UUID(str(target_assignee)) == uid:
                    is_assignee = True
            except ValueError:
                pass
        if not is_assignee and membership.role != "owner":
            raise ForbiddenError("Only assignee or owner can mark Done")
    if "title" in data and data["title"] is not None:
        t.title = data["title"]
    if "description" in data and data["description"] is not None:
        t.description = data["description"]
    status_changed = False
    old_status = t.status
    if "status" in data and data["status"] is not None:
        status_changed = data["status"] != t.status
        t.status = data["status"]
        if data["status"] == "Done":
            # Preserve the original completion time when re-saving Done.
            if t.completed_at is None:
                t.completed_at = utcnow()
        else:
            t.completed_at = None
    if "priority" in data and data["priority"] is not None:
        t.priority = data["priority"]
    if "due_date" in data:
        _check_due(data["due_date"])
        t.due_date = data["due_date"]
    assignee_changed = False
    old_assignee = t.assignee_id
    if "assignee_id" in data:
        new_aid = _check_assignee(db, pid_u, data["assignee_id"])
        assignee_changed = (old_assignee or None) != (new_aid or None)
        t.assignee_id = new_aid
    t = repo.save(db, t)
    # Distinct activity events so the feed can show "moved" vs "assigned"
    # (spec item 21) instead of one generic "updated" bucket.
    if status_changed:
        repo.log(db, pid_u, uid, "task_moved", f"Task '{t.title}' moved {old_status} -> {t.status}")
    if assignee_changed:
        repo.log(db, pid_u, uid, "task_assigned", f"Task '{t.title}' assigned")
    if not status_changed and not assignee_changed:
        repo.log(db, pid_u, uid, "task_updated", f"Task '{t.title}' updated")
    return t


def delete_task(db: Session, pid: str, tid: str, uid: uuid.UUID) -> Task:
    pid_u = _uuid(pid, "Project")
    tid_u = _uuid(tid, "Task")
    t = _get_scoped_task(db, pid_u, tid_u)
    membership = _require_member(db, pid_u, uid)
    is_creator = t.created_by is not None and uuid.UUID(str(t.created_by)) == uid
    if membership.role != "owner" and not is_creator:
        raise ForbiddenError("Owner or creator can delete")
    repo.delete_task(db, t)
    repo.log(db, pid_u, uid, "task_deleted", f"Task '{t.title}' deleted")
    return t


def create_comment(db: Session, pid: str, tid: str, uid: uuid.UUID, content: str):
    pid_u = _uuid(pid, "Project")
    tid_u = _uuid(tid, "Task")
    _get_scoped_task(db, pid_u, tid_u)
    _require_member(db, pid_u, uid)
    c = repo.create_comment(db, tid_u, uid, content)
    repo.log(db, pid_u, uid, "comment_created", "Comment added")
    return c
