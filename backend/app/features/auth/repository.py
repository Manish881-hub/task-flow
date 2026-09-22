"""Auth repository: data access only, no business rules."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import RefreshToken, User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def create_user(db: Session, name: str, email: str, password_hash: str) -> User:
    user = User(name=name.strip(), email=email.lower().strip(), password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_refresh_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
    return db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()


def create_refresh(db: Session, user_id, token_hash: str, expires_at) -> RefreshToken:
    row = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at, revoked=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def revoke_refresh(db: Session, row: RefreshToken) -> None:
    row.revoked = True
    db.commit()
