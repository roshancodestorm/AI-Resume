
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    provider: str
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    blocked_users: int
    admin_users: int


class UserStatusUpdate(BaseModel):
    is_active: bool


def get_provider(user: User) -> str:
    providers = []

    if user.google_id:
        providers.append("Google")

    if user.github_id:
        providers.append("GitHub")

    if user.hashed_password:
        providers.append("Email")

    return " + ".join(providers) if providers else "Unknown"


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
):
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
        "blocked_users": db.query(User).filter(User.is_active.is_(False)).count(),
        "admin_users": db.query(User).filter(User.role == "admin").count(),
    }


@router.get("/users", response_model=list[AdminUserResponse])
def get_all_users(
    search: Optional[str] = Query(None),
    status_filter: Literal["all", "active", "blocked"] = Query("all", alias="status"),
    provider: Literal["all", "google", "github", "email"] = Query("all"),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
            )
        )

    if status_filter == "active":
        query = query.filter(User.is_active.is_(True))
    elif status_filter == "blocked":
        query = query.filter(User.is_active.is_(False))

    if provider == "google":
        query = query.filter(User.google_id.isnot(None))
    elif provider == "github":
        query = query.filter(User.github_id.isnot(None))
    elif provider == "email":
        query = query.filter(User.hashed_password.isnot(None))

    users = query.order_by(User.created_at.desc()).all()

    return [
        AdminUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            provider=get_provider(user),
            created_at=user.created_at,
            last_login=user.last_login,
        )
        for user in users
    ]


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be blocked or modified here",
        )

    user.is_active = body.is_active
    db.commit()
    db.refresh(user)

    return {
        "message": "User activated" if user.is_active else "User blocked",
        "user_id": user.id,
        "is_active": user.is_active,
    }
