"""Tasks + comments controller."""
from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ForbiddenError, NotFoundError
from app.db.models import Task, User
from app.db.session import get_db
from app.features.projects import repository as prepo
from app.features.tasks import repository as repo
from app.features.tasks import service as svc
from app.features.tasks.schemas import CommentCreate, TaskCreate, TaskUpdate, comment_out, task_out

router = APIRouter(prefix="/api/v1", tags=["tasks"])

PRIORITY_ORDER = {"Low": 0, "Medium": 1, "High": 2}


def _envelope(items: list, total: int, page: int, per_page: int, base: str, extra_qs: str = "") -> dict:
    total_pages = max(1, math.ceil(total / per_page)) if total else 1
    return {
        "data": items,
        "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": total_pages},
        "links": {
            "self": f"{base}?page={page}&per_page={per_page}{extra_qs}",
            "next": f"{base}?page={page + 1}&per_page={per_page}{extra_qs}" if page < total_pages else None,
            "prev": f"{base}?page={page - 1}&per_page={per_page}{extra_qs}" if page > 1 else None,
        },
    }


def _require_member(db: Session, pid: uuid.UUID, uid: uuid.UUID):
    m = prepo.get_membership(db, pid, uid)
    if m is None:
        raise ForbiddenError("Not a project member")
    return m


@router.get("/projects/{project_id}/tasks")
def list_tasks(
    project_id: str,
    status: str | None = Query(None),
    priority: str | None = Query(None),
    assignee_id: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")
    if prepo.get_project(db, pid) is None:
        raise NotFoundError("Project")
    _require_member(db, pid, user.id)
    q = db.query(Task).filter(Task.project_id == pid)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if assignee_id:
        try:
            aid = uuid.UUID(str(assignee_id))
        except ValueError:
            raise NotFoundError("Assignee")
        q = q.filter(Task.assignee_id == aid)
    if search:
        # Escape LIKE wildcards so a literal "%" or "_" in the query can't
        # act as a wildcard (e.g. "100%" must not match "100X").
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped}%"
        q = q.filter((Task.title.ilike(like, escape="\\")) | (Task.description.ilike(like, escape="\\")))
    desc = order != "asc"
    if sort == "due_date":
        q = q.order_by(Task.due_date.desc() if desc else Task.due_date.asc())
    elif sort == "priority":
        pri = case(PRIORITY_ORDER, value=Task.priority, else_=1)
        q = q.order_by(pri.desc() if desc else pri.asc())
    else:
        q = q.order_by(Task.created_at.desc() if desc else Task.created_at.asc())
    total = q.count()
    rows = q.offset((page - 1) * per_page).limit(per_page).all()
    return _envelope([task_out(t) for t in rows], total, page, per_page, f"/api/v1/projects/{project_id}/tasks")


@router.post("/projects/{project_id}/tasks", status_code=201)
async def create_task(project_id: str, body: TaskCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = svc.create_task(db, project_id, user.id, body.model_dump())
    from app.ws.manager import manager

    payload = {"type": "task_created", "project_id": str(project_id), "task": task_out(t)}
    await manager.broadcast_to_project(str(project_id), payload)
    if t.assignee_id:
        await manager.send_to_user(str(t.assignee_id), {"type": "assigned_task_updated", **payload})
    return {"data": task_out(t)}


@router.get("/projects/{project_id}/tasks/{task_id}")
def get_task(project_id: str, task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        pid = uuid.UUID(str(project_id))
        tid = uuid.UUID(str(task_id))
    except ValueError:
        raise NotFoundError("Task")
    if prepo.get_project(db, pid) is None:
        raise NotFoundError("Project")
    _require_member(db, pid, user.id)
    t = repo.get_task(db, tid)
    if t is None or t.project_id != pid:
        raise NotFoundError("Task")
    return {"data": task_out(t)}


@router.patch("/projects/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str, task_id: str, body: TaskUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    t = svc.update_task(db, project_id, task_id, user.id, data)
    from app.ws.manager import manager

    payload = {"type": "task_updated", "project_id": str(project_id), "task": task_out(t)}
    await manager.broadcast_to_project(str(project_id), payload)
    if t.assignee_id:
        await manager.send_to_user(str(t.assignee_id), {"type": "assigned_task_updated", **payload})
    return {"data": task_out(t)}


@router.delete("/projects/{project_id}/tasks/{task_id}", status_code=204)
async def delete_task(project_id: str, task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    svc.delete_task(db, project_id, task_id, user.id)
    from app.ws.manager import manager

    await manager.broadcast_to_project(
        str(project_id), {"type": "task_deleted", "project_id": str(project_id), "task_id": str(task_id)}
    )
    return Response(status_code=204)


@router.get("/projects/{project_id}/tasks/{task_id}/comments")
def list_comments(project_id: str, task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        pid = uuid.UUID(str(project_id))
        tid = uuid.UUID(str(task_id))
    except ValueError:
        raise NotFoundError("Task")
    if prepo.get_project(db, pid) is None:
        raise NotFoundError("Project")
    _require_member(db, pid, user.id)
    t = repo.get_task(db, tid)
    if t is None or t.project_id != pid:
        raise NotFoundError("Task")
    rows = repo.list_comments(db, tid)
    items = []
    for c in rows:
        u = db.get(User, c.user_id)
        items.append(comment_out(c, u))
    return {"data": items}


@router.post("/projects/{project_id}/tasks/{task_id}/comments", status_code=201)
async def create_comment(
    project_id: str, task_id: str, body: CommentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    c = svc.create_comment(db, project_id, task_id, user.id, body.content)
    item = comment_out(c, user)
    from app.ws.manager import manager

    await manager.broadcast_to_project(
        str(project_id),
        {"type": "comment_created", "project_id": str(project_id), "task_id": str(task_id), "comment": item},
    )
    return {"data": item}


@router.get("/assigned")
def assigned_tasks(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Task).filter(Task.assignee_id == user.id)
    if status:
        q = q.filter(Task.status == status)
    q = q.order_by(Task.created_at.desc())
    total = q.count()
    rows = q.offset((page - 1) * per_page).limit(per_page).all()
    return _envelope([task_out(t) for t in rows], total, page, per_page, "/api/v1/assigned")
