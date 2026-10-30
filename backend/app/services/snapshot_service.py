import json
import hashlib
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Invoice, InvoiceSnapshot, ExtractionResult, ValidationResult, FraudAnalysis, Approval

class SnapshotService:
    @staticmethod
    def compute_hash(data: Dict[str, Any]) -> str:
        """Computes SHA-256 hash for tamper-proof verification."""
        serialized = json.dumps(data, sort_keys=True)
        return "0x" + hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def create_snapshot(cls, invoice_id: str, db: Session) -> InvoiceSnapshot:
        """
        Constructs a structured JSON snapshot matching Section 12 specifications,
        hashes it with SHA-256 for cryptographic immutability, and stores version.
        """
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Get latest extraction
        extraction = db.query(ExtractionResult).filter(
            ExtractionResult.invoice_id == invoice_id
        ).order_by(ExtractionResult.attempt_number.desc()).first()

        # Get latest validation
        validation = db.query(ValidationResult).filter(
            ValidationResult.invoice_id == invoice_id
        ).order_by(ValidationResult.id.desc()).first()

        # Get latest fraud analysis
        fraud = db.query(FraudAnalysis).filter(
            FraudAnalysis.invoice_id == invoice_id
        ).order_by(FraudAnalysis.id.desc()).first()

        # Get latest approval
        approval = db.query(Approval).filter(
            Approval.invoice_id == invoice_id
        ).order_by(Approval.id.desc()).first()

        extracted_data = extraction.extracted_data if extraction else {}
        supplier_data = extracted_data.get("supplier", {})
        invoice_details = extracted_data.get("invoice_details", {})
        financials = extracted_data.get("financials", {})

        # Build validation errors list
        val_errors = []
        if validation and isinstance(validation.validation_details, list):
            for rule in validation.validation_details:
                if rule.get("status") in ["FAIL", "WARNING"]:
                    val_errors.append(f"{rule.get('name')}: {rule.get('reason')}")

        fraud_issues = []
        if fraud and isinstance(fraud.detected_issues, list):
            for issue in fraud.detected_issues:
                fraud_issues.append(f"{issue.get('title')}: {issue.get('description')}")

        snapshot_content = {
            "invoice_id": invoice.id,
            "supplier": {
                "name": supplier_data.get("name") or (invoice.supplier.supplier_name if invoice.supplier else "N/A"),
                "gstin": supplier_data.get("gstin") or (invoice.supplier.gstin if invoice.supplier else "N/A")
            },
            "invoice_details": {
                "number": invoice.invoice_number or invoice_details.get("number") or "N/A",
                "date": invoice.invoice_date or invoice_details.get("date") or "N/A",
                "total_amount": invoice.total_amount or financials.get("grand_total") or 0.0
            },
            "extraction": {
                "status": extraction.status if extraction else invoice.processing_status,
                "confidence": extracted_data.get("overall_confidence", 95.0)
            },
            "validation": {
                "status": validation.validation_status if validation else invoice.validation_status,
                "errors": val_errors
            },
            "fraud_analysis": {
                "risk_score": fraud.risk_score if fraud else 10.0,
                "risk_category": fraud.risk_category if fraud else invoice.fraud_status,
                "issues": fraud_issues
            },
            "approval": {
                "status": invoice.approval_status,
                "decision": approval.decision if approval else "PENDING",
                "reason": approval.reason if approval else None
            }
        }

        # Calculate version
        latest_version = db.query(InvoiceSnapshot).filter(
            InvoiceSnapshot.invoice_id == invoice_id
        ).order_by(InvoiceSnapshot.version.desc()).first()
        
        version_num = (latest_version.version + 1) if latest_version else 1
        snapshot_hash = cls.compute_hash(snapshot_content)

        snapshot_record = InvoiceSnapshot(
            invoice_id=invoice.id,
            version=version_num,
            snapshot_json=snapshot_content,
            snapshot_hash=snapshot_hash
        )
        db.add(snapshot_record)
        db.commit()
        db.refresh(snapshot_record)
        return snapshot_record

snapshot_service = SnapshotService()
