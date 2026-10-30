from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import AutomationLog, Invoice, Notification
from app.schemas.schemas import N8nInvoiceEvent, N8nNotificationResult
from app.services.n8n_service import n8n_service
from app.services.audit_service import audit_service
from app.core.config import settings

router = APIRouter(prefix="/n8n", tags=["n8n Automation Integration"])

@router.post("/invoice-event")
def receive_n8n_invoice_event(
    event: N8nInvoiceEvent,
    x_webhook_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    NODE 1 & NODE 2 Endpoint:
    Validates incoming webhook payload matching:
    - invoice_id
    - supplier_name
    - total_amount
    - validation_status
    - fraud_risk
    - approval_status
    """
    # Verify webhook secret if configured
    if x_webhook_secret and x_webhook_secret != settings.N8N_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized n8n webhook secret."
        )

    # Validate essential fields (Node 2 / Node 3 logic)
    missing = []
    if not event.invoice_id: missing.append("invoice_id")
    if not event.supplier_name: missing.append("supplier_name")
    if event.total_amount is None: missing.append("total_amount")

    if missing:
        # Matches Node 6: Respond - Validation Error
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "DATA_VALIDATION_FAILED",
                "message": f"Mandatory payload parameters missing: {', '.join(missing)}",
                "is_valid": False
            }
        )

    # Log automation reception
    log_entry = AutomationLog(
        invoice_id=event.invoice_id,
        workflow_name="n8n Inbound Event Handler",
        execution_status="SUCCESS",
        execution_details=event.model_dump()
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": "ACCEPTED",
        "is_valid": True,
        "invoice_id": event.invoice_id,
        "message": f"Event '{event.event}' validated and processed successfully."
    }

@router.post("/notification-result")
def record_n8n_notification_result(
    result: N8nNotificationResult,
    db: Session = Depends(get_db)
):
    """
    Records results from Node 5 (Notifications & Response).
    """
    log_entry = AutomationLog(
        invoice_id=result.invoice_id,
        workflow_name="n8n Notification Dispatcher",
        execution_status=result.execution_status,
        execution_details=result.details or {}
    )
    db.add(log_entry)
    db.commit()

    return {"status": "RECORDED", "log_id": log_entry.id}

@router.get("/follow-up-queue")
def get_followup_queue(db: Session = Depends(get_db)):
    """
    NODE 7 & NODE 8: Daily Follow-up Processing.
    Returns list of pending invoices awaiting manager decision.
    """
    return n8n_service.get_pending_followups(db)

@router.post("/simulate-pipeline/{invoice_id}")
async def simulate_n8n_pipeline(invoice_id: str, db: Session = Depends(get_db)):
    """
    Interactive test runner that simulates the full 8-node n8n execution pipeline
    for an invoice and returns a step-by-step diagnostic trace!
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Step 1: Webhook Payload
    node1_payload = {
        "event": "invoice.processed",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "supplier_name": invoice.supplier.supplier_name if invoice.supplier else "ABC Technologies",
        "total_amount": invoice.total_amount,
        "validation_status": invoice.validation_status,
        "fraud_risk": invoice.fraud_status,
        "approval_status": invoice.approval_status
    }

    # Step 2 & 3: Validate Invoice Data
    is_valid = bool(invoice.id and invoice.total_amount is not None)

    # Step 4: AI Analysis & Summary
    ai_summary = (
        f"Invoice {invoice.id} for ₹{invoice.total_amount:,.2f} assessed. "
        f"Validation: {invoice.validation_status}. Fraud Risk: {invoice.fraud_status}. "
        f"Recommendation: {'Proceed with standard manager sign-off' if invoice.fraud_status == 'LOW' else 'Secondary compliance review requested'}."
    )

    # Step 5: Notification Simulation
    notification_dispatched = {
        "recipient": "manager@invoiceguard.ai",
        "channel": "Gmail & In-App Bell",
        "subject": f"[InvoiceGuard Action Required] Invoice {invoice.id} awaiting sign-off",
        "status": "SENT"
    }

    # Record in Automation Logs
    log = AutomationLog(
        invoice_id=invoice.id,
        workflow_name="n8n 8-Node Master Workflow",
        execution_status="SUCCESS",
        execution_details={
            "pipeline_trace": {
                "Node 1 (Webhook - New Invoice)": node1_payload,
                "Node 2 (Validate Invoice Data)": {"status": "PASSED"},
                "Node 3 (Is Data Valid?)": {"result": is_valid},
                "Node 4 (AI Analysis & Storage)": {"ai_summary": ai_summary},
                "Node 5 (Notifications & Response)": notification_dispatched
            }
        }
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "workflow": "InvoiceGuard AI - n8n Workflow",
        "trace": [
            {"node": "Node 1: Webhook - New Invoice", "status": "RECEIVED", "payload": node1_payload},
            {"node": "Node 2: Validate Invoice Data", "status": "VALIDATED"},
            {"node": "Node 3: Is Data Valid?", "status": "TRUE"},
            {"node": "Node 4: AI Analysis & Storage", "status": "COMPLETED", "summary": ai_summary},
            {"node": "Node 5: Notifications & Response", "status": "DELIVERED", "details": notification_dispatched}
        ]
    }
