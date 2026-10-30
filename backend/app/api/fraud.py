from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Invoice, FraudAnalysis, ExtractionResult, User
from app.schemas.schemas import FraudAnalysisResponse
from app.core.permissions import get_current_active_user, check_invoice_access, require_manager_or_admin
from app.services.fraud_service import fraud_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/invoices", tags=["Fraud Detection"])

@router.get("/{invoice_id}/fraud-analysis")
def get_fraud_analysis(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "view_fraud")

    result = db.query(FraudAnalysis).filter(
        FraudAnalysis.invoice_id == invoice_id
    ).order_by(desc(FraudAnalysis.id)).first()

    if not result:
        # Run dynamically if absent
        last_ext = db.query(ExtractionResult).filter(
            ExtractionResult.invoice_id == invoice_id
        ).order_by(desc(ExtractionResult.attempt_number)).first()

        if not last_ext:
            raise HTTPException(status_code=404, detail="No extracted invoice data available for fraud assessment.")

        fraud_data = fraud_service.evaluate_fraud_risk(invoice_id, last_ext.extracted_data, db)
        new_fr = FraudAnalysis(
            invoice_id=invoice_id,
            risk_score=fraud_data["risk_score"],
            risk_category=fraud_data["risk_category"],
            detected_issues=fraud_data["detected_issues"],
            explanation=fraud_data["explanation"]
        )
        db.add(new_fr)
        db.commit()
        db.refresh(new_fr)
        return new_fr

    return result

@router.post("/{invoice_id}/fraud-check")
def execute_fraud_check(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "execute_fraud")

    last_ext = db.query(ExtractionResult).filter(
        ExtractionResult.invoice_id == invoice_id
    ).order_by(desc(ExtractionResult.attempt_number)).first()

    if not last_ext:
        raise HTTPException(status_code=400, detail="Invoice has not been extracted yet.")

    res = fraud_service.evaluate_fraud_risk(invoice_id, last_ext.extracted_data, db)
    invoice.fraud_status = res["risk_category"]

    fraud_record = FraudAnalysis(
        invoice_id=invoice.id,
        risk_score=res["risk_score"],
        risk_category=res["risk_category"],
        detected_issues=res["detected_issues"],
        explanation=res["explanation"]
    )
    db.add(fraud_record)
    db.commit()

    audit_service.log_event(
        db,
        action="FRAUD_CHECK_TRIGGERED",
        invoice_id=invoice.id,
        details={"score": res["risk_score"], "category": res["risk_category"]}
    )

    return res
