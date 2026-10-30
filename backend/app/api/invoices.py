import os
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.models.models import Invoice, User, Supplier, InvoiceItem, ExtractionResult, ValidationResult, FraudAnalysis
from app.schemas.schemas import InvoiceResponse
from app.core.security import get_current_user, get_current_user_optional, require_roles
from app.core.config import settings
from app.services.ocr_service import ocr_service
from app.services.extraction_service import extraction_service
from app.services.validation_service import validation_service
from app.services.fraud_service import fraud_service
from app.services.snapshot_service import snapshot_service
from app.services.audit_service import audit_service
from app.services.n8n_service import n8n_service

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Handles complete upload and straight-through processing pipeline:
    Storage -> OCR -> Extraction -> Validation -> Fraud Check -> Snapshot -> Audit -> n8n.
    """
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # 2. Read and validate file content
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    if len(contents) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty or corrupted."
        )

    # 3. Generate unique invoice ID
    # Format: INV-<sequence>
    count = db.query(Invoice).count()
    num = 1001 + count
    while db.query(Invoice).filter(Invoice.id == f"INV-{num}").first() is not None:
        num += 1
    invoice_id = f"INV-{num}"
    
    # Save file to storage
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    safe_filename = f"{invoice_id}_{os.path.basename(file.filename)}"
    file_path = os.path.join(settings.STORAGE_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    user_id = current_user.id if current_user else None

    # 4. Create base invoice record
    invoice = Invoice(
        id=invoice_id,
        file_path=file_path,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        processing_status="PROCESSING",
        validation_status="PENDING",
        fraud_status="PENDING",
        approval_status="PENDING",
        uploaded_by=user_id
    )
    db.add(invoice)
    db.commit()

    audit_service.log_event(
        db,
        action="INVOICE_UPLOADED",
        invoice_id=invoice.id,
        user_id=user_id,
        details={"file_name": file.filename, "size_bytes": len(contents)}
    )

    try:
        # 5. Document Preprocessing & OCR
        ocr_result = ocr_service.extract_from_file(file_path)
        audit_service.log_event(
            db,
            action="OCR_COMPLETED",
            invoice_id=invoice.id,
            details={"chars_extracted": ocr_result["char_count"], "pages": ocr_result["page_count"]}
        )

        # 6. AI Structured Extraction
        extraction = extraction_service.parse_invoice_text(ocr_result["text"], file.filename)
        extracted_data = extraction["extracted_data"]
        confidence_scores = extraction["confidence_scores"]

        ext_record = ExtractionResult(
            invoice_id=invoice.id,
            extracted_data=extracted_data,
            confidence_scores=confidence_scores,
            ocr_text=ocr_result["text"],
            attempt_number=1,
            status=extraction["status"]
        )
        db.add(ext_record)

        # Update invoice attributes
        invoice.invoice_number = extracted_data["invoice_details"]["number"]
        invoice.invoice_date = extracted_data["invoice_details"]["date"]
        invoice.due_date = extracted_data["invoice_details"]["due_date"]
        invoice.total_amount = extracted_data["financials"]["grand_total"]

        # Link supplier if exists
        sup_gstin = extracted_data["supplier"]["gstin"]
        sup_name = extracted_data["supplier"]["name"]
        supplier_obj = None
        if sup_gstin:
            supplier_obj = db.query(Supplier).filter(Supplier.gstin.ilike(sup_gstin)).first()
        if not supplier_obj and sup_name:
            supplier_obj = db.query(Supplier).filter(Supplier.supplier_name.ilike(f"%{sup_name}%")).first()
        if supplier_obj:
            invoice.supplier_id = supplier_obj.id

        # Insert line items
        for it in extracted_data.get("items", []):
            item_obj = InvoiceItem(
                invoice_id=invoice.id,
                description=it.get("description", "Invoice Item"),
                quantity=float(it.get("quantity") or 1.0),
                unit_price=float(it.get("unit_price") or 0.0),
                tax=float(it.get("tax") or 0.0),
                total=float(it.get("total") or 0.0)
            )
            db.add(item_obj)

        audit_service.log_event(
            db,
            action="AI_EXTRACTION_COMPLETED",
            invoice_id=invoice.id,
            details={"overall_confidence": extraction["overall_confidence"], "items_count": len(extracted_data.get("items", []))}
        )

        # 6b. Statutory GST Calculation Agent Node (LangGraph pipeline integration)
        gst_result = None
        try:
            from app.services.gst import gst_calculation_node
            gst_state = gst_calculation_node({
                "invoice_id": invoice.id,
                "extracted_data": extracted_data,
                "confidence_scores": confidence_scores,
                "overall_confidence": extraction["overall_confidence"]
            })
            gst_result = gst_state.get("gst_result")
            if gst_result:
                audit_service.log_event(
                    db,
                    action="GST_CALCULATION_AUDIT",
                    invoice_id=invoice.id,
                    details={
                        "status": gst_result.get("status"),
                        "supply_type": gst_result.get("supply_type"),
                        "discrepancies": len(gst_result.get("discrepancies", []))
                    }
                )
        except Exception as e:
            # Safe pass-through: never fail invoice processing on GST agent edge case
            pass

        # 7. Business Validation Engine (incorporates independent GST audit)
        validation = validation_service.validate_invoice(invoice.id, extracted_data, db, gst_result=gst_result)
        invoice.validation_status = validation["validation_status"]
        
        val_record = ValidationResult(
            invoice_id=invoice.id,
            validation_status=validation["validation_status"],
            validation_details=validation["validation_details"]
        )
        db.add(val_record)

        audit_service.log_event(
            db,
            action="BUSINESS_VALIDATION_COMPLETED",
            invoice_id=invoice.id,
            details={"status": validation["validation_status"]}
        )

        # 8. Independent Fraud Risk Analysis
        fraud = fraud_service.evaluate_fraud_risk(invoice.id, extracted_data, db)
        invoice.fraud_status = fraud["risk_category"]

        fraud_record = FraudAnalysis(
            invoice_id=invoice.id,
            risk_score=fraud["risk_score"],
            risk_category=fraud["risk_category"],
            detected_issues=fraud["detected_issues"],
            explanation=fraud["explanation"]
        )
        db.add(fraud_record)

        audit_service.log_event(
            db,
            action="FRAUD_DETECTION_ANALYSIS",
            invoice_id=invoice.id,
            details={"score": fraud["risk_score"], "category": fraud["risk_category"]}
        )

        # Check if should auto-escalate
        if fraud["risk_category"] == "HIGH":
            invoice.approval_status = "ESCALATED"

        invoice.processing_status = "COMPLETED"
        db.commit()

        # 9. Generate Cryptographic JSON Snapshot
        snapshot = snapshot_service.create_snapshot(invoice.id, db)
        audit_service.log_event(
            db,
            action="JSON_SNAPSHOT_GENERATED",
            invoice_id=invoice.id,
            details={"version": snapshot.version, "hash": snapshot.snapshot_hash}
        )

        # 10. Trigger n8n Automation Webhook
        await n8n_service.trigger_invoice_webhook(invoice.id, "invoice.processed", db)

    except Exception as e:
        invoice.processing_status = "FAILED"
        db.commit()
        audit_service.log_event(
            db,
            action="PROCESSING_ERROR",
            invoice_id=invoice.id,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )

    db.refresh(invoice)
    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "supplier_name": invoice.supplier.supplier_name if invoice.supplier else extracted_data["supplier"]["name"],
        "total_amount": invoice.total_amount,
        "processing_status": invoice.processing_status,
        "validation_status": invoice.validation_status,
        "fraud_status": invoice.fraud_status,
        "approval_status": invoice.approval_status,
        "confidence": extraction["overall_confidence"],
        "gst_result": gst_result,
        "message": "Invoice successfully uploaded, extracted, validated, and evaluated."
    }

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    search: Optional[str] = None,
    validation_status: Optional[str] = None,
    fraud_status: Optional[str] = None,
    approval_status: Optional[str] = None,
    supplier_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).order_by(desc(Invoice.created_at))

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.id.ilike(s),
                Invoice.invoice_number.ilike(s),
                Invoice.file_name.ilike(s)
            )
        )
    if validation_status:
        query = query.filter(Invoice.validation_status.ilike(validation_status))
    if fraud_status:
        query = query.filter(Invoice.fraud_status.ilike(fraud_status))
    if approval_status:
        query = query.filter(Invoice.approval_status.ilike(approval_status))
    if supplier_id:
        query = query.filter(Invoice.supplier_id == supplier_id)

    invoices = query.offset(offset).limit(limit).all()

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

@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    last_ext = db.query(ExtractionResult).filter(ExtractionResult.invoice_id == invoice_id).order_by(desc(ExtractionResult.attempt_number)).first()
    last_val = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).order_by(desc(ValidationResult.id)).first()
    last_fraud = db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == invoice_id).order_by(desc(FraudAnalysis.id)).first()

    gst_result = None
    if last_ext and last_ext.raw_extraction:
        try:
            from app.services.gst import gst_calculation_node
            raw = last_ext.raw_extraction
            ext_data = raw.get("extracted_data") if isinstance(raw, dict) and "extracted_data" in raw else raw
            conf = raw.get("confidence_scores", {}) if isinstance(raw, dict) else {}
            gst_state = gst_calculation_node({
                "invoice_id": invoice.id,
                "extracted_data": ext_data,
                "confidence_scores": conf,
                "overall_confidence": last_ext.overall_confidence
            })
            gst_result = gst_state.get("gst_result")
        except Exception:
            gst_result = None

    return {
        "invoice": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "supplier_id": invoice.supplier_id,
            "supplier_name": invoice.supplier.supplier_name if invoice.supplier else "N/A",
            "supplier_gstin": invoice.supplier.gstin if invoice.supplier else "N/A",
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "total_amount": invoice.total_amount,
            "file_name": invoice.file_name,
            "file_type": invoice.file_type,
            "processing_status": invoice.processing_status,
            "validation_status": invoice.validation_status,
            "fraud_status": invoice.fraud_status,
            "approval_status": invoice.approval_status,
            "created_at": invoice.created_at
        },
        "items": invoice.items,
        "extraction": last_ext,
        "validation": last_val,
        "fraud_analysis": last_fraud,
        "gst_result": gst_result
    }

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager"]))
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Delete physical file
    if os.path.exists(invoice.file_path):
        try:
            os.remove(invoice.file_path)
        except Exception:
            pass

    audit_service.log_event(
        db,
        action="INVOICE_DELETED",
        invoice_id=invoice.id,
        user_id=current_user.id,
        details={"invoice_number": invoice.invoice_number, "amount": invoice.total_amount}
    )

    db.delete(invoice)
    db.commit()
    return {"message": f"Invoice {invoice_id} successfully deleted."}
