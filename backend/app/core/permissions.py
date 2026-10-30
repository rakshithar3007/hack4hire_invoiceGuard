from typing import Set, Optional, Callable
from fastapi import Depends, HTTPException, status
from app.core.config import settings
from app.core.security import get_current_user
from app.models.models import User, Invoice

# --- Role Constants ---
ROLE_EMPLOYEE = "employee"
ROLE_MANAGER = "manager"
ROLE_ADMIN = "admin"

ALL_ROLES = [ROLE_EMPLOYEE, ROLE_MANAGER, ROLE_ADMIN]

# --- Centralized Permission Definitions ---
PERMISSIONS = {
    ROLE_EMPLOYEE: {
        "dashboard:employee",
        "invoices:upload",
        "invoices:view_own",
        "invoices:view_own_details",
        "reports:view_own",
        "audit:view_own",
    },
    ROLE_MANAGER: {
        "dashboard:manager",
        "invoices:upload",
        "invoices:view_own",
        "invoices:view_assigned",
        "invoices:view_assigned_details",
        "invoices:verify",
        "invoices:approve",
        "invoices:reject",
        "invoices:escalate",
        "reports:view_assigned",
        "reports:export_assigned",
        "audit:view_assigned",
    },
    ROLE_ADMIN: {
        "*"  # Wildcard for complete administration
    }
}

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Validates that authenticated user account is active."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if hasattr(current_user, "is_active") and not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your user account has been deactivated. Please contact an administrator."
        )
    return current_user

def has_permission(user: User, permission: str) -> bool:
    """Verifies whether user role holds the given permission token."""
    if not settings.RBAC_ENFORCED:
        return True
    
    role = (user.role or ROLE_EMPLOYEE).lower()
    user_perms = PERMISSIONS.get(role, set())
    if "*" in user_perms:
        return True
    return permission in user_perms

def require_permission(permission: str) -> Callable:
    """FastAPI Dependency factory enforcing granular RBAC permission."""
    def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission}' for role '{current_user.role}'."
            )
        return current_user
    return permission_checker

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Strict Administrator dependency."""
    if (current_user.role or "").lower() != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this operation."
        )
    return current_user

def require_manager_or_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Manager or Administrator dependency."""
    if (current_user.role or "").lower() not in [ROLE_MANAGER, ROLE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Administrator privileges required for this operation."
        )
    return current_user

def check_invoice_access(invoice: Invoice, user: User, action: str = "view") -> bool:
    """
    Object-level security check for invoice access.
    - Admin: Full organization access
    - Manager: Assigned invoices, department scope, or own uploads
    - Employee: Strictly own uploads
    """
    if not settings.RBAC_ENFORCED:
        return True

    user_role = (user.role or ROLE_EMPLOYEE).lower()
    if user_role == ROLE_ADMIN:
        return True

    # Employee: Only own uploads
    if user_role == ROLE_EMPLOYEE:
        if invoice.uploaded_by is not None and invoice.uploaded_by == user.id:
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Employees are only authorized to access invoices they submitted."
        )

    # Manager: Assigned department, assigned manager ID, or own uploads
    if user_role == ROLE_MANAGER:
        inv_dept = getattr(invoice, "department", "General") or "General"
        usr_dept = getattr(user, "department", "General") or "General"
        assigned_mgr = getattr(invoice, "assigned_manager_id", None)

        if (
            invoice.uploaded_by == user.id
            or assigned_mgr == user.id
            or inv_dept.lower() == usr_dept.lower()
            or inv_dept.lower() == "general"
        ):
            return True

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Managers cannot access invoices outside their assigned department or team scope."
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized access to invoice record."
    )

def check_approval_eligibility(invoice: Invoice, user: User) -> bool:
    """
    Verifies that the manager or admin is eligible to approve or reject the invoice:
    1. Maker-Checker separation of duties (creator cannot approve own invoice).
    2. Object-level departmental scope check.
    3. Manager approval financial limit enforcement.
    """
    if not settings.RBAC_ENFORCED:
        return True

    user_role = (user.role or ROLE_EMPLOYEE).lower()
    if user_role not in [ROLE_MANAGER, ROLE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and administrators can approve or reject invoices."
        )

    # 1. Maker-Checker Rule: Creator cannot approve their own invoice
    if invoice.uploaded_by is not None and invoice.uploaded_by == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Maker-Checker Security Policy: You cannot approve or reject an invoice you uploaded."
        )

    # 2. Scope check
    check_invoice_access(invoice, user, action="approve")

    # 3. Manager Approval Limit Check
    if user_role == ROLE_MANAGER:
        limit = getattr(user, "approval_limit", 100000.0) or 100000.0
        amount = invoice.total_amount or 0.0
        if amount > limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Approval Limit Exceeded: Invoice amount (₹{amount:,.2f}) exceeds your approval limit of ₹{limit:,.2f}. Must be escalated to Executive/Admin."
            )

    return True
