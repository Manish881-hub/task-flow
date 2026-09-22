from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def _make_engine(database_url: str):
    kwargs: dict = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
    return create_engine(database_url, **kwargs)


# Lazily bound in app lifespan; tests rebind via override.
engine = None
SessionLocal = None


def init_engine(database_url: str):
    global engine, SessionLocal
    engine = _make_engine(database_url)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return engine


def get_db():
    assert SessionLocal is not None, "DB not initialized"
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
