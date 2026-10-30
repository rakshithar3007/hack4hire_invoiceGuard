from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Invoice, ValidationResult, ExtractionResult, User
from app.schemas.schemas import ValidationResultResponse
from app.core.permissions import get_current_active_user, check_invoice_access, require_manager_or_admin
from app.services.validation_service import validation_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/invoices", tags=["Business Validation"])

@router.get("/{invoice_id}/validation")
def get_validation(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "view_validation")

    result = db.query(ValidationResult).filter(
        ValidationResult.invoice_id == invoice_id
    ).order_by(desc(ValidationResult.id)).first()

    if not result:
        # If no validation record yet, run validation dynamically
        last_ext = db.query(ExtractionResult).filter(
            ExtractionResult.invoice_id == invoice_id
        ).order_by(desc(ExtractionResult.attempt_number)).first()

        if not last_ext:
            raise HTTPException(status_code=404, detail="No extracted data available to validate.")

        val_data = validation_service.validate_invoice(invoice_id, last_ext.extracted_data, db)
        new_val = ValidationResult(
            invoice_id=invoice_id,
            validation_status=val_data["validation_status"],
            validation_details=val_data["validation_details"]
        )
        db.add(new_val)
        db.commit()
        db.refresh(new_val)
        return new_val

    return result

@router.post("/{invoice_id}/validate")
def execute_validation(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    check_invoice_access(invoice, current_user, "execute_validation")

    last_ext = db.query(ExtractionResult).filter(
        ExtractionResult.invoice_id == invoice_id
    ).order_by(desc(ExtractionResult.attempt_number)).first()

    if not last_ext:
        raise HTTPException(status_code=400, detail="Invoice has not been extracted yet.")

    res = validation_service.validate_invoice(invoice_id, last_ext.extracted_data, db)
    
    invoice.validation_status = res["validation_status"]
    val_record = ValidationResult(
        invoice_id=invoice.id,
        validation_status=res["validation_status"],
        validation_details=res["validation_details"]
    )
    db.add(val_record)
    db.commit()

    audit_service.log_event(
        db,
        action="BUSINESS_VALIDATION_TRIGGERED",
        invoice_id=invoice.id,
        details={"status": res["validation_status"], "rules_count": len(res["validation_details"])}
    )

    return res
