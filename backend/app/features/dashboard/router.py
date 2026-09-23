"""Dashboard controller: aggregated read model."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
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
    completed_this_week = 0
    now = datetime.now(timezone.utc)
    today = now.date()
    week_ago = now - timedelta(days=7)
    for t in my_tasks:
        if t.status in by_status:
            by_status[t.status] += 1
        due = ensure_aware(t.due_date)
        if due is not None and due.date() < today and t.status != "Done":
            overdue += 1
        done_at = ensure_aware(t.completed_at)
        if done_at is not None and done_at >= week_ago and t.status == "Done":
            completed_this_week += 1
    # Per-project open-task counts in two batched queries (no N+1):
    # one for project names, one grouped count of non-Done tasks.
    projects = db.query(Project).filter(Project.id.in_(pids)).all() if pids else []
    open_counts: dict = {}
    busiest = None
    if pids:
        rows = (
            db.query(Task.project_id, func.count(Task.id))
            .filter(Task.project_id.in_(pids), Task.status != "Done")
            .group_by(Task.project_id)
            .all()
        )
        open_counts = {pid: n for pid, n in rows}
        if rows:
            top_pid, top_n = max(rows, key=lambda r: r[1])
            pname = next((p.name for p in projects if p.id == top_pid), None)
            busiest = {"project_id": str(top_pid), "project_name": pname, "open_tasks": int(top_n)}
    per_project: list[dict] = []
    for p in projects:
        total_n = db.query(func.count(Task.id)).filter(Task.project_id == p.id).scalar() or 0
        per_project.append(
            {
                "project_id": str(p.id),
                "project_name": p.name,
                "task_count": int(total_n),
                "open_tasks": int(open_counts.get(p.id, 0)),
            }
        )
    recent = []
    if pids:
        recent = (
            db.query(ActivityLog)
            .filter(ActivityLog.project_id.in_(pids))
            .order_by(ActivityLog.created_at.desc())
            .limit(10)
            .all()
        )
    return {
        "data": {
            "project_count": len(pids),
            "assigned_to_me": by_status,
            "assigned_total": sum(by_status.values()),
            "completed_this_week": completed_this_week,
            "overdue_count": overdue,
            "busiest_project": busiest,
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
