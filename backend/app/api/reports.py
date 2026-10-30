import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Invoice, Supplier, FraudAnalysis, ValidationResult, User
from app.core.permissions import get_current_active_user, ROLE_EMPLOYEE, ROLE_MANAGER, ROLE_ADMIN
from sqlalchemy import or_
import fitz  # PyMuPDF for PDF export

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

def _scope_invoice_query(query, user: User):
    role = (user.role or ROLE_EMPLOYEE).lower()
    if role == ROLE_EMPLOYEE:
        return query.filter(Invoice.uploaded_by == user.id)
    elif role == ROLE_MANAGER:
        dept = getattr(user, "department", "General") or "General"
        return query.filter(
            or_(
                Invoice.assigned_manager_id == user.id,
                Invoice.department == dept,
                Invoice.department == "General",
                Invoice.uploaded_by == user.id
            )
        )
    return query

@router.get("/invoices")
def get_invoices_report(
    supplier_id: Optional[int] = None,
    validation_status: Optional[str] = None,
    fraud_status: Optional[str] = None,
    approval_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Invoice).order_by(desc(Invoice.created_at))
    query = _scope_invoice_query(query, current_user)

    if supplier_id: query = query.filter(Invoice.supplier_id == supplier_id)
    if validation_status: query = query.filter(Invoice.validation_status.ilike(validation_status))
    if fraud_status: query = query.filter(Invoice.fraud_status.ilike(fraud_status))
    if approval_status: query = query.filter(Invoice.approval_status.ilike(approval_status))

    invoices = query.all()
    rows = []
    for inv in invoices:
        rows.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "supplier": inv.supplier.supplier_name if inv.supplier else "N/A",
            "gstin": inv.supplier.gstin if inv.supplier else "N/A",
            "date": inv.invoice_date,
            "amount": inv.total_amount,
            "validation": inv.validation_status,
            "fraud_risk": inv.fraud_status,
            "approval": inv.approval_status,
            "created_at": inv.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return {"count": len(rows), "data": rows}

@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Invoice).order_by(desc(Invoice.created_at))
    invoices = _scope_invoice_query(query, current_user).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Invoice ID", "Invoice Number", "Supplier", "GSTIN", "Date",
        "Total Amount (INR)", "Processing Status", "Validation Status",
        "Fraud Risk", "Approval Status", "Created At"
    ])

    for inv in invoices:
        writer.writerow([
            inv.id,
            inv.invoice_number or "N/A",
            inv.supplier.supplier_name if inv.supplier else "N/A",
            inv.supplier.gstin if inv.supplier else "N/A",
            inv.invoice_date or "N/A",
            f"{inv.total_amount or 0.0:.2f}",
            inv.processing_status,
            inv.validation_status,
            inv.fraud_status,
            inv.approval_status,
            inv.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoiceguard_report.csv"}
    )

@router.get("/export/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Invoice).order_by(desc(Invoice.created_at))
    invoices = _scope_invoice_query(query, current_user).all()

    # Create PDF document with PyMuPDF
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)  # Landscape A4 for wide table

    # Title & Banner
    page.insert_text((40, 50), "INVOICEGUARD AI - AUDIT & PROCESSING REPORT", fontsize=16, color=(0.05, 0.45, 0.45))
    page.insert_text((40, 70), "Confidential compliance export generated from InvoiceGuard AI Engine", fontsize=9, color=(0.4, 0.4, 0.4))
    page.draw_line((40, 85), (802, 85), color=(0.8, 0.8, 0.8), width=1)

    # Table Header
    headers = [("ID", 40), ("Inv Number", 110), ("Supplier", 200), ("Date", 350), ("Amount", 430), ("Validation", 510), ("Risk", 600), ("Approval", 670)]
    for h, x in headers:
        page.insert_text((x, 105), h, fontsize=10, color=(0.1, 0.1, 0.1))
    page.draw_line((40, 115), (802, 115), color=(0.7, 0.7, 0.7), width=0.5)

    y = 135
    for inv in invoices[:18]:  # Up to 18 rows per page
        page.insert_text((40, y), inv.id, fontsize=9)
        page.insert_text((110, y), (inv.invoice_number or "N/A")[:12], fontsize=9)
        sup = (inv.supplier.supplier_name if inv.supplier else "N/A")[:22]
        page.insert_text((200, y), sup, fontsize=9)
        page.insert_text((350, y), str(inv.invoice_date or "N/A"), fontsize=9)
        page.insert_text((430, y), f"₹{inv.total_amount or 0.0:,.2f}", fontsize=9)
        page.insert_text((510, y), inv.validation_status, fontsize=9)
        page.insert_text((600, y), inv.fraud_status, fontsize=9)
        page.insert_text((670, y), inv.approval_status, fontsize=9)
        y += 22

    pdf_bytes = doc.tobytes()
    doc.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=invoiceguard_report.pdf"}
    )
