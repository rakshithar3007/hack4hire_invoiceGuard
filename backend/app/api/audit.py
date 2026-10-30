from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database.session import get_db
from app.models.models import AuditLog, User, Invoice
from app.schemas.schemas import AuditLogResponse
from app.core.permissions import (
    get_current_active_user, check_invoice_access,
    ROLE_EMPLOYEE, ROLE_MANAGER, ROLE_ADMIN
)

router = APIRouter(prefix="", tags=["Audit Logs"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_all_audit_logs(
    invoice_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(AuditLog).order_by(desc(AuditLog.timestamp))

    user_role = (current_user.role or ROLE_EMPLOYEE).lower()
    if user_role == ROLE_EMPLOYEE:
        # Employee can only view logs involving their own user_id or invoices they uploaded
        emp_inv_ids = db.query(Invoice.id).filter(Invoice.uploaded_by == current_user.id).subquery()
        query = query.filter(
            or_(
                AuditLog.user_id == current_user.id,
                AuditLog.invoice_id.in_(emp_inv_ids)
            )
        )
    elif user_role == ROLE_MANAGER:
        dept = getattr(current_user, "department", "General") or "General"
        mgr_inv_ids = db.query(Invoice.id).filter(
            or_(
                Invoice.department == dept,
                Invoice.assigned_manager_id == current_user.id,
                Invoice.department == "General",
                Invoice.uploaded_by == current_user.id
            )
        ).subquery()
        query = query.filter(
            or_(
                AuditLog.user_id == current_user.id,
                AuditLog.invoice_id.in_(mgr_inv_ids)
            )
        )
    # Admin sees all audit logs

    if invoice_id:
        query = query.filter(AuditLog.invoice_id == invoice_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    logs = query.offset(offset).limit(limit).all()
    results = []
    for l in logs:
        results.append(AuditLogResponse(
            id=l.id,
            invoice_id=l.invoice_id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else "System Process",
            action=l.action,
            details=l.details,
            record_hash=l.record_hash,
            timestamp=l.timestamp
        ))
    return results

@router.get("/invoices/{invoice_id}/audit", response_model=List[AuditLogResponse])
def get_invoice_audit_trail(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    check_invoice_access(invoice, current_user, "view_audit")

    logs = db.query(AuditLog).filter(
        AuditLog.invoice_id == invoice_id
    ).order_by(AuditLog.timestamp.asc()).all()

    results = []
    for l in logs:
        results.append(AuditLogResponse(
            id=l.id,
            invoice_id=l.invoice_id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else "System Process",
            action=l.action,
            details=l.details,
            record_hash=l.record_hash,
            timestamp=l.timestamp
        ))
    return results
