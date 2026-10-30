from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Invoice, ExtractionResult, User
from app.schemas.schemas import ExtractionUpdateRequest, ReExtractRequest
from app.core.security import get_current_user_optional
from app.core.permissions import get_current_active_user, check_invoice_access, require_manager_or_admin
from app.services.extraction_service import extraction_service
from app.services.ocr_service import ocr_service
from app.services.reextraction_service import reextraction_service
from app.services.validation_service import validation_service
from app.services.fraud_service import fraud_service
from app.services.snapshot_service import snapshot_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/invoices", tags=["Extraction"])

@router.get("/{invoice_id}/extraction")
def get_extraction(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    check_invoice_access(invoice, current_user, "view_extraction")

    result = db.query(ExtractionResult).filter(
        ExtractionResult.invoice_id == invoice_id
    ).order_by(desc(ExtractionResult.attempt_number)).first()

    if not result:
        raise HTTPException(status_code=404, detail="No extraction result found for this invoice.")
    return result

@router.post("/{invoice_id}/extract")
def run_extraction(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    check_invoice_access(invoice, current_user, "extract")

    ocr_res = ocr_service.extract_from_file(invoice.file_path)
    extraction = extraction_service.parse_invoice_text(ocr_res["text"], invoice.file_name)

    ext_record = ExtractionResult(
        invoice_id=invoice.id,
        extracted_data=extraction["extracted_data"],
        confidence_scores=extraction["confidence_scores"],
        ocr_text=ocr_res["text"],
        attempt_number=1,
        status=extraction["status"]
    )
    db.add(ext_record)
    
    # Update invoice fields
    invoice.invoice_number = extraction["extracted_data"]["invoice_details"]["number"]
    invoice.invoice_date = extraction["extracted_data"]["invoice_details"]["date"]
    invoice.due_date = extraction["extracted_data"]["invoice_details"]["due_date"]
    invoice.total_amount = extraction["extracted_data"]["financials"]["grand_total"]
    db.commit()

    return ext_record

@router.put("/{invoice_id}/extraction")
def update_extraction(
    invoice_id: str,
    update_data: ExtractionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Allows user/employee manual correction of extracted invoice fields.
    Preserves audit history and automatically regenerates snapshot and revalidates.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    last_ext = db.query(ExtractionResult).filter(
        ExtractionResult.invoice_id == invoice_id
    ).order_by(desc(ExtractionResult.attempt_number)).first()

    if not last_ext:
        raise HTTPException(status_code=404, detail="No extraction found to modify.")

    # Deep copy and update
    current_data = dict(last_ext.extracted_data)
    
    if update_data.supplier_name is not None:
        current_data["supplier"]["name"] = update_data.supplier_name
    if update_data.supplier_gstin is not None:
        current_data["supplier"]["gstin"] = update_data.supplier_gstin
    if update_data.supplier_address is not None:
        current_data["supplier"]["address"] = update_data.supplier_address
    if update_data.supplier_contact is not None:
        current_data["supplier"]["contact"] = update_data.supplier_contact

    if update_data.invoice_number is not None:
        current_data["invoice_details"]["number"] = update_data.invoice_number
        invoice.invoice_number = update_data.invoice_number
    if update_data.invoice_date is not None:
        current_data["invoice_details"]["date"] = update_data.invoice_date
        invoice.invoice_date = update_data.invoice_date
    if update_data.due_date is not None:
        current_data["invoice_details"]["due_date"] = update_data.due_date
        invoice.due_date = update_data.due_date
    if update_data.po_number is not None:
        current_data["invoice_details"]["po_number"] = update_data.po_number

    if update_data.subtotal is not None:
        current_data["financials"]["subtotal"] = update_data.subtotal
    if update_data.cgst is not None:
        current_data["financials"]["cgst"] = update_data.cgst
    if update_data.sgst is not None:
        current_data["financials"]["sgst"] = update_data.sgst
    if update_data.igst is not None:
        current_data["financials"]["igst"] = update_data.igst
    if update_data.grand_total is not None:
        current_data["financials"]["grand_total"] = update_data.grand_total
        invoice.total_amount = update_data.grand_total

    # Update manual confidence to 100% for human-corrected fields
    conf = dict(last_ext.confidence_scores)
    conf["grand_total"] = 100.0
    conf["supplier_name"] = 100.0
    conf["supplier_gstin"] = 100.0
    conf["invoice_number"] = 100.0

    last_ext.extracted_data = current_data
    last_ext.confidence_scores = conf
    db.commit()

    # Re-run business validation & fraud check on corrected data
    val_res = validation_service.validate_invoice(invoice.id, current_data, db)
    invoice.validation_status = val_res["validation_status"]

    fraud_res = fraud_service.evaluate_fraud_risk(invoice.id, current_data, db)
    invoice.fraud_status = fraud_res["risk_category"]

    db.commit()

    # Audit log
    audit_service.log_event(
        db,
        action="EXTRACTION_MANUALLY_CORRECTED",
        invoice_id=invoice.id,
        user_id=current_user.id if current_user else None,
        details={"fields_updated": update_data.model_dump(exclude_unset=True)}
    )

    # Regenerate versioned snapshot
    snapshot_service.create_snapshot(invoice.id, db)

    return {
        "message": "Extracted data successfully updated and revalidated.",
        "invoice_id": invoice.id,
        "validation_status": invoice.validation_status,
        "fraud_status": invoice.fraud_status,
        "data": current_data
    }

@router.post("/{invoice_id}/re-extract")
def trigger_re_extraction(
    invoice_id: str,
    payload: ReExtractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Executes independent checker re-extraction loop up to 3 attempts.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "re_extract")

    result = reextraction_service.re_extract(invoice_id, payload.strategy or "heuristic_ai", db)
    return result

@router.get("/{invoice_id}/checker")
def get_checker_status(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns independent checker verification result ('CHECKER PASSED?').
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "checker")

    return reextraction_service.run_independent_checker(invoice_id, db)
