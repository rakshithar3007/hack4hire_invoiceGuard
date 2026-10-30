from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.init_db import seed_demo_data, DEMO_INVOICE_IDS
from app.models.models import Invoice, User, Supplier, PurchaseOrder

router = APIRouter(prefix="/demo", tags=["Demo Management"])

@router.get("/status")
def get_demo_status(db: Session = Depends(get_db)):
    """Returns the current state of demo and user records in the SQLite database."""
    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0
    demo_invoices = db.query(func.count(Invoice.id)).filter(Invoice.id.in_(DEMO_INVOICE_IDS)).scalar() or 0
    user_invoices = total_invoices - demo_invoices
    
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_suppliers = db.query(func.count(Supplier.id)).scalar() or 0
    total_pos = db.query(func.count(PurchaseOrder.id)).scalar() or 0

    return {
        "status": "READY" if demo_invoices >= len(DEMO_INVOICE_IDS) else "PARTIAL",
        "demo_invoices_present": demo_invoices,
        "demo_invoices_expected": len(DEMO_INVOICE_IDS),
        "user_created_invoices": user_invoices,
        "total_invoices": total_invoices,
        "users_count": total_users,
        "suppliers_count": total_suppliers,
        "purchase_orders_count": total_pos,
        "message": "Demo data initialized and operational."
    }

@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    """Safely seeds missing demo records without touching existing user data."""
    seed_demo_data(db, force_reset_demo=False)
    return {
        "status": "SUCCESS",
        "message": "Demo records verified and backfilled successfully."
    }

@router.post("/reset")
def reset_demo(
    reset_all: bool = Query(False, description="Set True to also clear user-created test invoices"),
    db: Session = Depends(get_db)
):
    """
    Resets demo records back to baseline state for presentations.
    By default, only INV-1001 through INV-1004 are reset, preserving user uploads.
    """
    if reset_all:
        from app.models.models import (
            Approval, AuditLog, Notification, InvoiceSnapshot,
            ExtractionResult, ValidationResult, FraudAnalysis, InvoiceItem
        )
        db.query(Approval).delete()
        db.query(AuditLog).delete()
        db.query(Notification).delete()
        db.query(InvoiceSnapshot).delete()
        db.query(ExtractionResult).delete()
        db.query(ValidationResult).delete()
        db.query(FraudAnalysis).delete()
        db.query(InvoiceItem).delete()
        db.query(Invoice).delete()
        db.commit()

    seed_demo_data(db, force_reset_demo=True)
    return {
        "status": "SUCCESS",
        "message": "Demo records successfully restored to clean demonstration baseline."
    }
