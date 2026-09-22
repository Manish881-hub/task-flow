"""Dashboard controller: aggregated read model."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import ensure_aware
from app.db.models import ActivityLog, Project, ProjectMember, Task
from app.db.session import get_db

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).all()
    pids = [m.project_id for m in memberships]
    my_tasks = db.query(Task).filter(Task.assignee_id == user.id).all()
    by_status = {"To Do": 0, "In Progress": 0, "Done": 0}
    overdue = 0
    now = datetime.now(timezone.utc)
    today = now.date()
    for t in my_tasks:
        if t.status in by_status:
            by_status[t.status] += 1
        due = ensure_aware(t.due_date)
        if due is not None and due.date() < today and t.status != "Done":
            overdue += 1
    per_project: list[dict] = []
    for pid in pids:
        p = db.get(Project, pid)
        if p is None:
            continue
        n = db.query(Task).filter(Task.project_id == pid).count()
        per_project.append({"project_id": str(pid), "project_name": p.name, "task_count": n})
    recent = (
        db.query(ActivityLog)
        .filter(ActivityLog.project_id.in_(pids) if pids else False)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "data": {
            "assigned_to_me": by_status,
            "overdue_count": overdue,
            "per_project": per_project,
            "recent_activity": [
                {
                    "id": str(r.id),
                    "project_id": str(r.project_id),
                    "user_id": str(r.user_id),
                    "event_type": r.event_type,
                    "description": r.description,
                    "created_at": r.created_at,
                }
                for r in recent
            ],
        }
    }
