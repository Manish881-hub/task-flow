"""Seed: alice/bob + Demo Sprint + 4 tasks + 1 comment. Uses bcrypt directly."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.core.security import hash_password
from app.db.base import Base
from app.db.models import Comment, Project, ProjectMember, Task, User
from app.db.session import init_engine

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./taskflow.db")

engine = init_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)

from app.db.session import SessionLocal

db = SessionLocal()
try:
    alice = db.query(User).filter(User.email == "alice@example.com").first()
    if alice is None:
        alice = User(name="Alice", email="alice@example.com", password_hash=hash_password("password123"))
        db.add(alice)
        db.commit()
        db.refresh(alice)
    bob = db.query(User).filter(User.email == "bob@example.com").first()
    if bob is None:
        bob = User(name="Bob", email="bob@example.com", password_hash=hash_password("password123"))
        db.add(bob)
        db.commit()
        db.refresh(bob)
    proj = db.query(Project).filter(Project.name == "Demo Sprint").first()
    if proj is None:
        proj = Project(name="Demo Sprint", description="Seeded demo project", owner_id=alice.id)
        db.add(proj)
        db.commit()
        db.refresh(proj)
        db.add(ProjectMember(project_id=proj.id, user_id=alice.id, role="owner"))
        db.add(ProjectMember(project_id=proj.id, user_id=bob.id, role="member"))
        db.commit()
        from datetime import datetime, timezone

        tasks = [
            Task(project_id=proj.id, title="Setup repo", description="Init", status="Done", priority="High", created_by=alice.id, completed_at=datetime.now(timezone.utc)),
            Task(project_id=proj.id, title="Design board", description="UI", status="In Progress", priority="Medium", assignee_id=bob.id, created_by=alice.id),
            Task(project_id=proj.id, title="Write API", description="Endpoints", status="To Do", priority="Medium", created_by=alice.id),
            Task(project_id=proj.id, title="Add WS", description="Live updates", status="To Do", priority="Low", created_by=bob.id),
        ]
        for t in tasks:
            db.add(t)
        db.commit()
        first = db.query(Task).filter(Task.project_id == proj.id).first()
        if first is not None:
            db.add(Comment(task_id=first.id, user_id=bob.id, content="Looks good!"))
            db.commit()
    print("seeded: alice@example.com / bob@example.com / password123 + Demo Sprint")
finally:
    db.close()
