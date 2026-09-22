"""Projects controller."""
from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import NotFoundError
from app.db.models import ActivityLog, Project
from app.db.session import get_db
from app.features.projects import repository as repo
from app.features.projects import service as svc
from app.features.projects.schemas import MemberInvite, ProjectCreate, ProjectUpdate, project_out

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _page(items: list, total: int, page: int, per_page: int, base: str) -> dict:
    total_pages = max(1, math.ceil(total / per_page)) if total else 1
    return {
        "data": items,
        "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": total_pages},
        "links": {
            "self": f"{base}?page={page}&per_page={per_page}",
            "next": f"{base}?page={page + 1}&per_page={per_page}" if page < total_pages else None,
            "prev": f"{base}?page={page - 1}&per_page={per_page}" if page > 1 else None,
        },
    }


@router.get("")
def list_projects(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    all_projects = repo.list_projects_for_user(db, user.id)
    total = len(all_projects)
    start = (page - 1) * per_page
    chunk = all_projects[start: start + per_page]
    return _page([project_out(p) for p in chunk], total, page, per_page, "/api/v1/projects")


@router.post("", status_code=201)
async def create_project(
    body: ProjectCreate,
    response: Response,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    p = svc.create_project(db, user.id, body.name, body.description or "")
    response.headers["Location"] = f"/api/v1/projects/{p.id}"
    from app.ws.manager import manager

    await manager.broadcast_to_project(
        str(p.id), {"type": "activity", "event": "project_created", "project_id": str(p.id)}
    )
    return {"data": project_out(p)}


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")
    p = repo.get_project(db, pid)
    if p is None:
        raise NotFoundError("Project")
    svc.require_membership(db, pid, user.id)
    # Build members manually — never let Pydantic auto-serialize ORM relationship.
    members = []
    for m in repo.list_members(db, pid):
        u = repo.get_user(db, m.user_id)
        if u is None:
            continue
        members.append(
            {
                "user_id": str(u.id),
                "name": u.name,
                "email": u.email,
                "role": m.role,
                "joined_at": m.joined_at,
            }
        )
    data = project_out(p)
    data["members"] = members
    data["task_counts"] = repo.task_counts(db, pid)
    return {"data": data}


@router.patch("/{project_id}")
def update_project(
    project_id: str, body: ProjectUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")
    p: Project | None = repo.get_project(db, pid)
    if p is None:
        raise NotFoundError("Project")
    svc.require_owner(db, pid, user.id)
    p = repo.update_project(db, p, body.name, body.description)
    return {"data": project_out(p)}


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")
    p = repo.get_project(db, pid)
    if p is None:
        raise NotFoundError("Project")
    svc.require_owner(db, pid, user.id)
    repo.delete_project(db, p)
    return Response(status_code=204)


@router.post("/{project_id}/members", status_code=201)
async def invite_member(
    project_id: str, body: MemberInvite, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    invited, _m = svc.invite_member(db, project_id, user.id, str(body.email), body.role)
    from app.ws.manager import manager

    await manager.broadcast_to_project(
        str(project_id),
        {"type": "member_invited", "project_id": str(project_id), "user_id": str(invited.id)},
    )
    return {"data": {"user_id": str(invited.id), "email": invited.email, "role": body.role}}


@router.delete("/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: str, user_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    svc.remove_member(db, project_id, user.id, user_id)
    from app.ws.manager import manager

    await manager.broadcast_to_project(
        str(project_id),
        {"type": "member_removed", "project_id": str(project_id), "user_id": str(user_id)},
    )
    return Response(status_code=204)


@router.get("/{project_id}/activity")
def project_activity(
    project_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        raise NotFoundError("Project")
    if repo.get_project(db, pid) is None:
        raise NotFoundError("Project")
    svc.require_membership(db, pid, user.id)
    q = db.query(ActivityLog).filter(ActivityLog.project_id == pid).order_by(ActivityLog.created_at.desc())
    total = q.count()
    rows = q.offset((page - 1) * per_page).limit(per_page).all()
    items = [
        {
            "id": str(r.id),
            "project_id": str(r.project_id),
            "user_id": str(r.user_id),
            "event_type": r.event_type,
            "description": r.description,
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return _page(items, total, page, per_page, f"/api/v1/projects/{project_id}/activity")
