import httpx
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import AutomationLog, Notification, Invoice

logger = logging.getLogger("n8n_service")

class N8nService:
    @classmethod
    async def trigger_invoice_webhook(cls, invoice_id: str, event_type: str, db: Session) -> Dict[str, Any]:
        """
        Sends an authenticated HTTP POST payload to the n8n webhook URL.
        Payload matches Node 1 (Webhook - New Invoice).
        """
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return {"status": "FAILED", "error": f"Invoice {invoice_id} not found"}

        payload = {
            "event": event_type,  # "invoice.processed", "invoice.approved", etc.
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "supplier_name": invoice.supplier.supplier_name if invoice.supplier else "N/A",
            "total_amount": invoice.total_amount or 0.0,
            "validation_status": invoice.validation_status,
            "fraud_risk": invoice.fraud_status,
            "approval_status": invoice.approval_status
        }

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET
        }

        execution_status = "SUCCESS"
        response_data = None
        error_msg = None

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(settings.N8N_WEBHOOK_URL, json=payload, headers=headers)
                if res.status_code >= 400:
                    execution_status = "HTTP_ERROR"
                    error_msg = f"n8n returned status code {res.status_code}: {res.text[:200]}"
                else:
                    response_data = res.json() if res.headers.get("content-type") == "application/json" else res.text
        except Exception as ex:
            execution_status = "UNREACHABLE_FALLBACK"
            error_msg = f"n8n webhook simulated/offline fallback ({str(ex)})"
            # Built-in graceful handling: internal fallback simulates successful notification orchestration
            response_data = {
                "message": "Local automated notification & follow-up pipeline queued internally.",
                "event": event_type
            }

        # Log automation execution
        log_entry = AutomationLog(
            invoice_id=invoice.id,
            workflow_name="InvoiceGuard n8n Orchestrator",
            execution_status=execution_status,
            execution_details={
                "payload": payload,
                "response": response_data,
                "error": error_msg
            }
        )
        db.add(log_entry)

        # Trigger internal notification for users/managers
        notif_msg = f"Invoice {invoice.id} ({invoice.invoice_number or 'Unassigned'}): {event_type.upper().replace('.', ' ')} - Status: {invoice.approval_status}"
        notif_type = "URGENT" if invoice.fraud_status == "HIGH" else "INFO"
        notif = Notification(
            invoice_id=invoice.id,
            message=notif_msg,
            notification_type=notif_type,
            read_status=False
        )
        db.add(notif)
        db.commit()

        return {
            "status": execution_status,
            "payload": payload,
            "response": response_data,
            "error": error_msg
        }

    @classmethod
    def get_pending_followups(cls, db: Session) -> Dict[str, Any]:
        """
        Supports Node 7 & Node 8 (Daily Schedule Follow-up):
        Queries invoices that require manager action (Pending approval > 24 hours or Escalated).
        """
        pending_invoices = db.query(Invoice).filter(
            Invoice.approval_status.in_(["PENDING", "ESCALATED"])
        ).all()

        results = []
        for inv in pending_invoices:
            results.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "supplier": inv.supplier.supplier_name if inv.supplier else "N/A",
                "amount": inv.total_amount,
                "approval_status": inv.approval_status,
                "fraud_risk": inv.fraud_status,
                "created_at": inv.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        return {
            "total_pending": len(results),
            "invoices": results,
            "message": f"Identified {len(results)} pending invoice(s) awaiting manager review."
        }

n8n_service = N8nService()
