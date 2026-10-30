from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Invoice, Approval, User, Notification
from app.schemas.schemas import ApprovalRequest, ApprovalResponse, InvoiceResponse
from app.core.security import get_current_user, require_roles
from app.services.audit_service import audit_service
from app.services.snapshot_service import snapshot_service
from app.services.n8n_service import n8n_service

router = APIRouter(prefix="", tags=["Approvals"])

@router.get("/approvals/pending", response_model=List[InvoiceResponse])
def get_pending_approvals(db: Session = Depends(get_db)):
    """
    Returns all invoices requiring manager review (PENDING or ESCALATED).
    Matches the Manager Approval Dashboard shown in reference video frame 15!
    """
    invoices = db.query(Invoice).filter(
        Invoice.approval_status.in_(["PENDING", "ESCALATED"])
    ).order_by(desc(Invoice.created_at)).all()

    result = []
    for inv in invoices:
        result.append(InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            supplier_id=inv.supplier_id,
            supplier_name=inv.supplier.supplier_name if inv.supplier else "N/A",
            supplier_gstin=inv.supplier.gstin if inv.supplier else "N/A",
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            total_amount=inv.total_amount,
            file_path=inv.file_path,
            file_name=inv.file_name,
            file_type=inv.file_type,
            processing_status=inv.processing_status,
            validation_status=inv.validation_status,
            fraud_status=inv.fraud_status,
            approval_status=inv.approval_status,
            uploaded_by=inv.uploaded_by,
            uploader_name=inv.uploader.name if inv.uploader else "System",
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            items=inv.items or []
        ))
    return result

@router.post("/invoices/{invoice_id}/approve", response_model=ApprovalResponse)
async def approve_invoice(
    invoice_id: str,
    req: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["manager", "admin"]))
):
    # Database transaction with row lock
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.approval_status == "APPROVED":
        raise HTTPException(status_code=400, detail="Invoice has already been approved.")

    # High-risk guard
    if invoice.fraud_status == "HIGH" and not (req.reason and len(req.reason.strip()) >= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="High fraud-risk invoices require an explicit written override justification."
        )

    invoice.approval_status = "APPROVED"
    
    approval = Approval(
        invoice_id=invoice.id,
        manager_id=current_user.id,
        decision="APPROVED",
        reason=req.reason or "Manager verified and approved for disbursement."
    )
    db.add(approval)
    db.commit()

    # Append-only audit record
    audit_service.log_event(
        db,
        action="INVOICE_APPROVED",
        invoice_id=invoice.id,
        user_id=current_user.id,
        details={"manager": current_user.name, "reason": approval.reason}
    )

    # Regenerate snapshot
    snapshot_service.create_snapshot(invoice.id, db)

    # Trigger n8n webhook notification
    await n8n_service.trigger_invoice_webhook(invoice.id, "invoice.approved", db)

    return ApprovalResponse(
        id=approval.id,
        invoice_id=approval.invoice_id,
        manager_id=approval.manager_id,
        manager_name=current_user.name,
        decision=approval.decision,
        reason=approval.reason,
        created_at=approval.created_at
    )

@router.post("/invoices/{invoice_id}/reject", response_model=ApprovalResponse)
async def reject_invoice(
    invoice_id: str,
    req: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["manager", "admin"]))
):
    if not req.reason or len(req.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A specific rejection reason is mandatory."
        )

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.approval_status = "REJECTED"

    approval = Approval(
        invoice_id=invoice.id,
        manager_id=current_user.id,
        decision="REJECTED",
        reason=req.reason
    )
    db.add(approval)
    db.commit()

    audit_service.log_event(
        db,
        action="INVOICE_REJECTED",
        invoice_id=invoice.id,
        user_id=current_user.id,
        details={"manager": current_user.name, "reason": req.reason}
    )

    snapshot_service.create_snapshot(invoice.id, db)
    await n8n_service.trigger_invoice_webhook(invoice.id, "invoice.rejected", db)

    return ApprovalResponse(
        id=approval.id,
        invoice_id=approval.invoice_id,
        manager_id=approval.manager_id,
        manager_name=current_user.name,
        decision=approval.decision,
        reason=approval.reason,
        created_at=approval.created_at
    )

@router.post("/invoices/{invoice_id}/escalate", response_model=ApprovalResponse)
async def escalate_invoice(
    invoice_id: str,
    req: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["manager", "admin"]))
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.approval_status = "ESCALATED"

    approval = Approval(
        invoice_id=invoice.id,
        manager_id=current_user.id,
        decision="ESCALATED",
        reason=req.reason or "Escalated for deeper forensic and compliance audit."
    )
    db.add(approval)
    db.commit()

    audit_service.log_event(
        db,
        action="INVOICE_ESCALATED",
        invoice_id=invoice.id,
        user_id=current_user.id,
        details={"manager": current_user.name, "reason": approval.reason}
    )

    snapshot_service.create_snapshot(invoice.id, db)
    await n8n_service.trigger_invoice_webhook(invoice.id, "invoice.escalated", db)

    return ApprovalResponse(
        id=approval.id,
        invoice_id=approval.invoice_id,
        manager_id=approval.manager_id,
        manager_name=current_user.name,
        decision=approval.decision,
        reason=approval.reason,
        created_at=approval.created_at
    )
