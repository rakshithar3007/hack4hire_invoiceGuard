from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="", tags=["Audit Logs"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_all_audit_logs(
    invoice_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).order_by(desc(AuditLog.timestamp))
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
def get_invoice_audit_trail(invoice_id: str, db: Session = Depends(get_db)):
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
