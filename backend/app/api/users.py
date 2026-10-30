from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import (
    UserResponse, UserAdminCreate, UserRoleUpdate, UserStatusUpdate, UserLimitUpdate
)
from app.core.security import get_password_hash
from app.core.permissions import require_admin, PERMISSIONS, ALL_ROLES, ROLE_ADMIN, ROLE_EMPLOYEE
from app.services.audit_service import audit_service

router = APIRouter(prefix="/users", tags=["User & Role Management"])

@router.get("", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only: Retrieve all registered system users."""
    users = db.query(User).order_by(User.id.asc()).all()
    results = []
    for u in users:
        res = UserResponse.from_orm(u)
        role_key = (u.role or ROLE_EMPLOYEE).lower()
        res.permissions = list(PERMISSIONS.get(role_key, []))
        results.append(res)
    return results

@router.post("", response_model=UserResponse)
def create_user_by_admin(
    user_in: UserAdminCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only: Create user with pre-assigned role, department, and approval limit."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    role = user_in.role.lower()
    if role not in ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role}'. Allowed roles: {', '.join(ALL_ROLES)}"
        )

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role,
        department=user_in.department,
        approval_limit=user_in.approval_limit if role == "manager" else 0.0,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit_service.log_event(
        db,
        action="ADMIN_USER_CREATED",
        user_id=admin_user.id,
        details={
            "created_user_id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "department": new_user.department
        }
    )

    res = UserResponse.from_orm(new_user)
    res.permissions = list(PERMISSIONS.get(role, []))
    return res

@router.put("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    req: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only: Assign or change a user's role. Prevents demoting the last active administrator."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = req.role.lower()
    if new_role not in ALL_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{new_role}'. Must be one of: {', '.join(ALL_ROLES)}"
        )

    # Protect against demoting the last active administrator
    if target_user.role == ROLE_ADMIN and new_role != ROLE_ADMIN:
        active_admin_count = db.query(func.count(User.id)).filter(
            User.role == ROLE_ADMIN,
            User.is_active == True
        ).scalar() or 0
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security policy violation: Cannot demote the last remaining active Administrator."
            )

    old_role = target_user.role
    target_user.role = new_role
    db.commit()
    db.refresh(target_user)

    audit_service.log_event(
        db,
        action="USER_ROLE_CHANGED",
        user_id=admin_user.id,
        details={"target_user_id": target_user.id, "old_role": old_role, "new_role": new_role}
    )

    res = UserResponse.from_orm(target_user)
    res.permissions = list(PERMISSIONS.get(new_role, []))
    return res

@router.put("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    req: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only: Activate or deactivate a user account. Prevents deactivating the last active administrator."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Protect against deactivating the last active administrator
    if target_user.role == ROLE_ADMIN and req.is_active is False:
        active_admin_count = db.query(func.count(User.id)).filter(
            User.role == ROLE_ADMIN,
            User.is_active == True
        ).scalar() or 0
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security policy violation: Cannot deactivate the last remaining active Administrator."
            )

    target_user.is_active = req.is_active
    db.commit()
    db.refresh(target_user)

    audit_service.log_event(
        db,
        action="USER_STATUS_UPDATED",
        user_id=admin_user.id,
        details={"target_user_id": target_user.id, "is_active": req.is_active}
    )

    res = UserResponse.from_orm(target_user)
    res.permissions = list(PERMISSIONS.get(target_user.role, []))
    return res

@router.put("/{user_id}/limit", response_model=UserResponse)
def update_user_approval_limit(
    user_id: int,
    req: UserLimitUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only: Configure financial approval limit for manager in INR."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.approval_limit < 0:
        raise HTTPException(status_code=400, detail="Approval limit cannot be negative.")

    target_user.approval_limit = req.approval_limit
    db.commit()
    db.refresh(target_user)

    audit_service.log_event(
        db,
        action="APPROVAL_LIMIT_UPDATED",
        user_id=admin_user.id,
        details={"target_user_id": target_user.id, "new_limit": req.approval_limit}
    )

    res = UserResponse.from_orm(target_user)
    res.permissions = list(PERMISSIONS.get(target_user.role, []))
    return res
