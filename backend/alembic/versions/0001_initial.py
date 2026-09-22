"""initial tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.create_table(
        "projects",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("owner_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "project_members",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("project_id", sa.CHAR(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("project_id", "user_id", name="uq_member_project_user"),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("project_id", sa.CHAR(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="To Do"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="Medium"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assignee_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "comments",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("task_id", sa.CHAR(36), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "activity_log",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("project_id", sa.CHAR(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_type", sa.String(60), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    for t in ("activity_log", "comments", "tasks", "project_members", "projects", "refresh_tokens", "users"):
        op.drop_table(t)
