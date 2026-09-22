"""Portable UUID + UTC helpers. Critical for Postgres/SQLite parity."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator


class GUID(TypeDecorator):
    """Native UUID on Postgres, CHAR(36) fallback elsewhere (SQLite)."""

    impl = CHAR(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value: Any, dialect) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            if isinstance(value, uuid.UUID):
                return value
            return uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value: Any, dialect) -> Any:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime | None) -> datetime | None:
    """Normalize naive datetimes (SQLite) to aware UTC for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def utcnow_naive_compat() -> datetime:
    # Stored as timezone-aware; SQLite drops tzinfo on read -> use ensure_aware.
    return utcnow()
