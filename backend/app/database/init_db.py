import os
import sys
import datetime
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from app.database.session import Base, engine, SessionLocal
from app.models.models import (
    User, Supplier, PurchaseOrder, Invoice, InvoiceItem,
    ExtractionResult, ValidationResult, FraudAnalysis, Approval,
    AuditLog, Notification, InvoiceSnapshot, AutomationLog
)
from app.core.security import get_password_hash
from app.core.config import settings

DEMO_INVOICE_IDS = ["INV-1001", "INV-1002", "INV-1003", "INV-1004"]

def create_sample_pdf(file_path: str, title: str, inv_number: str, supplier_name: str, gstin: str, total_str: str, items_list: list):
    """Generates a real PDF file on disk with clear invoice layout."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    if os.path.exists(file_path):
        return

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # Standard A4
    
    # Header
    page.insert_text((50, 60), "TAX INVOICE", fontsize=18, color=(0.05, 0.45, 0.45))
    page.insert_text((50, 85), f"Supplier: {supplier_name}", fontsize=12)
    page.insert_text((50, 102), f"GSTIN: {gstin}", fontsize=10)
    page.insert_text((50, 118), "Address: 701, Tech Cyber Gateway, Outer Ring Rd, Bengaluru, Karnataka 560103", fontsize=9, color=(0.3, 0.3, 0.3))
    page.insert_text((50, 132), "Contact: contact@vendor.com | +91 80 4123 9000", fontsize=9, color=(0.3, 0.3, 0.3))
    
    # Invoice metadata
    page.insert_text((380, 85), f"Invoice No: {inv_number}", fontsize=11)
    page.insert_text((380, 102), "Invoice Date: 2026-10-30", fontsize=10)
    page.insert_text((380, 118), "Due Date: 2026-11-29", fontsize=10)
    page.insert_text((380, 134), "PO Number: PO-2026-8801", fontsize=10)
    
    # Divider line
    page.draw_line((50, 155), (545, 155), color=(0.8, 0.8, 0.8), width=1)
    
    # Table Header
    page.insert_text((50, 175), "Item Description", fontsize=10, color=(0.1, 0.1, 0.1))
    page.insert_text((320, 175), "Qty", fontsize=10)
    page.insert_text((380, 175), "Unit Price", fontsize=10)
    page.insert_text((470, 175), "Total", fontsize=10)
    page.draw_line((50, 185), (545, 185), color=(0.8, 0.8, 0.8), width=0.5)
    
    y = 210
    for item in items_list:
        page.insert_text((50, y), item[0], fontsize=9)
        page.insert_text((320, y), str(item[1]), fontsize=9)
        page.insert_text((380, y), f"₹{item[2]:,.2f}", fontsize=9)
        page.insert_text((470, y), f"₹{item[3]:,.2f}", fontsize=9)
        y += 24
        
    page.draw_line((50, y), (545, y), color=(0.8, 0.8, 0.8), width=1)
    y += 30
    page.insert_text((350, y), "Grand Total:", fontsize=12, color=(0.05, 0.45, 0.45))
    page.insert_text((450, y), f"₹{total_str}", fontsize=13, color=(0.05, 0.45, 0.45))
    
    page.insert_text((50, y + 60), "Authorized Signatory: InvoiceGuard System Verified", fontsize=8, color=(0.5, 0.5, 0.5))
    
    doc.save(file_path)
    doc.close()

def seed_demo_data(db, force_reset_demo: bool = False):
    """
    Safely seeds initial users, suppliers, POs, and complete test cases.
    If force_reset_demo=True, only demo records (INV-1001 through INV-1004) are reset.
    User-created invoices and custom records are NEVER deleted or overwritten.
    """
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)

    # 1. Seed or retrieve Users
    users_data = [
        {"name": "Admin User", "email": "admin@invoiceguard.ai", "password": "Admin@123", "role": "admin", "department": "Operations", "approval_limit": None, "is_active": True},
        {"name": "Alex Employee", "email": "employee@invoiceguard.ai", "password": "Employee@123", "role": "employee", "department": "Engineering", "approval_limit": 0.0, "is_active": True},
        {"name": "Sarah Manager", "email": "manager@invoiceguard.ai", "password": "Manager@123", "role": "manager", "department": "Engineering", "approval_limit": 100000.0, "is_active": True}
    ]
    user_map = {}
    for ud in users_data:
        u = db.query(User).filter(User.email == ud["email"]).first()
        if not u:
            u = User(
                name=ud["name"],
                email=ud["email"],
                password_hash=get_password_hash(ud["password"]),
                role=ud["role"],
                department=ud.get("department", "General"),
                approval_limit=ud.get("approval_limit"),
                is_active=ud.get("is_active", True)
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        else:
            # Safely backfill any missing RBAC fields on existing seed records
            updated = False
            if hasattr(u, "department") and not u.department:
                u.department = ud.get("department", "General")
                updated = True
            if hasattr(u, "approval_limit") and u.approval_limit is None and ud.get("approval_limit") is not None:
                u.approval_limit = ud.get("approval_limit")
                updated = True
            if hasattr(u, "is_active") and u.is_active is None:
                u.is_active = True
                updated = True
            if updated:
                db.commit()
        user_map[ud["role"]] = u

    employee_user = user_map.get("employee")
    manager_user = user_map.get("manager")

    # Safely backfill demo invoices with department and assigned_manager_id
    db.query(Invoice).filter(Invoice.id.in_(DEMO_INVOICE_IDS)).update(
        {
            Invoice.department: "Engineering",
            Invoice.assigned_manager_id: manager_user.id if manager_user else None,
            Invoice.uploaded_by: employee_user.id if employee_user else None
        },
        synchronize_session=False
    )
    db.commit()

    # 2. Seed Suppliers
    suppliers_data = [
        {
            "name": "ABC Technologies Pvt Ltd",
            "gstin": "29ABCDE1234F1Z5",
            "address": "701, Tech Cyber Gateway, Outer Ring Rd, Bengaluru, Karnataka 560103",
            "contact": "+91 80 4123 9000 | accounts@abctech.in"
        },
        {
            "name": "Apex Global Innovations",
            "gstin": "27AABCT2345Q1ZS",
            "address": "Tower 4, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
            "contact": "+91 22 6789 1100 | billing@apexinnovations.com"
        },
        {
            "name": "NextGen Enterprise Solutions",
            "gstin": "07AAACN5678P1ZQ",
            "address": "Plot 18, Connaught Place, New Delhi 110001",
            "contact": "+91 11 2345 6789 | finance@nextgensolutions.in"
        },
        {
            "name": "Zenith Hardware & Networking",
            "gstin": "33AAACZ9876R1ZM",
            "address": "Mount Road, Anna Salai, Chennai, Tamil Nadu 600002",
            "contact": "+91 44 2850 4000 | sales@zenithhardware.com"
        }
    ]
    supplier_map = {}
    for sd in suppliers_data:
        s = db.query(Supplier).filter(Supplier.gstin == sd["gstin"]).first()
        if not s:
            s = Supplier(
                supplier_name=sd["name"],
                gstin=sd["gstin"],
                address=sd["address"],
                contact_details=sd["contact"]
            )
            db.add(s)
            db.commit()
            db.refresh(s)
        supplier_map[sd["name"]] = s

    sup1 = supplier_map["ABC Technologies Pvt Ltd"]
    sup2 = supplier_map["Apex Global Innovations"]
    sup3 = supplier_map["NextGen Enterprise Solutions"]
    sup4 = supplier_map["Zenith Hardware & Networking"]

    # 3. Seed Purchase Orders
    po_data = [
        ("PO-2026-8801", sup1.id, 25000.0),
        ("PO-2026-8802", sup2.id, 118000.0),
        ("PO-2026-8803", sup3.id, 50000.0),
        ("PO-2026-8804", sup4.id, 84500.0),
    ]
    for po_num, s_id, exp_amt in po_data:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_num).first()
        if not po:
            po = PurchaseOrder(po_number=po_num, supplier_id=s_id, expected_amount=exp_amt, status="OPEN")
            db.add(po)
    db.commit()

    # If force_reset_demo is requested, remove demo-specific artifacts safely
    if force_reset_demo:
        for demo_id in DEMO_INVOICE_IDS:
            db.query(Approval).filter(Approval.invoice_id == demo_id).delete()
            db.query(AuditLog).filter(AuditLog.invoice_id == demo_id).delete()
            db.query(Notification).filter(Notification.invoice_id == demo_id).delete()
            db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == demo_id).delete()
            db.query(ExtractionResult).filter(ExtractionResult.invoice_id == demo_id).delete()
            db.query(ValidationResult).filter(ValidationResult.invoice_id == demo_id).delete()
            db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == demo_id).delete()
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == demo_id).delete()
            db.query(Invoice).filter(Invoice.id == demo_id).delete()
        db.commit()

    # 4. Create sample invoice PDF documents on disk
    inv1_file = os.path.join(settings.STORAGE_DIR, "INV-1001-ABC.pdf")
    create_sample_pdf(
        inv1_file, "Tax Invoice", "ABC-2026-001",
        "ABC Technologies Pvt Ltd", "29ABCDE1234F1Z5", "25,000.00",
        [("Cloud Infrastructure & Security Suite", 1, 21186.44, 21186.44), ("CGST (9%) + SGST (9%)", 1, 3813.56, 3813.56)]
    )

    inv2_file = os.path.join(settings.STORAGE_DIR, "INV-1002-DUP.pdf")
    create_sample_pdf(
        inv2_file, "Duplicate Invoice", "ABC-2026-001",
        "ABC Technologies Pvt Ltd", "29ABCDE1234F1Z5", "25,000.00",
        [("Duplicate Submission - Cloud Suite", 1, 21186.44, 21186.44)]
    )

    inv3_file = os.path.join(settings.STORAGE_DIR, "INV-1003-APEX.pdf")
    create_sample_pdf(
        inv3_file, "Tax Invoice", "APX-99042",
        "Apex Global Innovations", "27AABCT2345Q1ZS", "1,18,000.00",
        [("Enterprise Annual AI License", 1, 100000.00, 100000.00), ("GST 18%", 1, 18000.00, 18000.00)]
    )

    inv4_file = os.path.join(settings.STORAGE_DIR, "INV-1004-RISK.pdf")
    create_sample_pdf(
        inv4_file, "High Amount Invoice", "NXG-7712",
        "NextGen Enterprise Solutions", "07AAACN5678P1ZQ", "850,000.00",
        [("Emergency Data Center Migration Services", 1, 850000.00, 850000.00)]
    )

    # 5. Seed Demo Invoices and individual components if missing
    # TEST 1: Valid Invoice (INV-1001)
    if not db.query(Invoice).filter(Invoice.id == "INV-1001").first():
        t1_inv = Invoice(
            id="INV-1001",
            invoice_number="ABC-2026-001",
            supplier_id=sup1.id,
            invoice_date="2026-10-30",
            due_date="2026-11-29",
            total_amount=25000.0,
            file_path=inv1_file,
            file_name="INV-1001-ABC.pdf",
            file_type="application/pdf",
            processing_status="COMPLETED",
            validation_status="PASSED",
            fraud_status="LOW",
            approval_status="PENDING",
            uploaded_by=employee_user.id if employee_user else None
        )
        db.add(t1_inv)
        db.commit()

    if not db.query(ExtractionResult).filter(ExtractionResult.invoice_id == "INV-1001").first():
        ext1 = ExtractionResult(
            invoice_id="INV-1001",
            extracted_data={
                "supplier": {"name": "ABC Technologies Pvt Ltd", "gstin": "29ABCDE1234F1Z5", "address": sup1.address, "contact": sup1.contact_details},
                "invoice_details": {"number": "ABC-2026-001", "date": "2026-10-30", "due_date": "2026-11-29", "po_number": "PO-2026-8801"},
                "items": [{"description": "Cloud Infrastructure & Security Suite", "quantity": 1, "unit_price": 21186.44, "tax": 3813.56, "total": 21186.44}],
                "financials": {"subtotal": 21186.44, "cgst": 1906.78, "sgst": 1906.78, "igst": 0.0, "grand_total": 25000.0},
                "overall_confidence": 98.5
            },
            confidence_scores={"supplier_name": 99.0, "supplier_gstin": 99.5, "invoice_number": 98.0, "grand_total": 99.0},
            ocr_text="TAX INVOICE ABC Technologies Pvt Ltd GSTIN: 29ABCDE1234F1Z5 Invoice No: ABC-2026-001 Date: 2026-10-30 Total: ₹25,000.00",
            attempt_number=1,
            status="COMPLETED"
        )
        db.add(ext1)

    if not db.query(ValidationResult).filter(ValidationResult.invoice_id == "INV-1001").first():
        val1 = ValidationResult(
            invoice_id="INV-1001",
            validation_status="PASSED",
            validation_details=[
                {"rule_id": "REQ_FIELDS", "name": "Required Field Validation", "status": "PASS", "reason": "All required fields present.", "expected_value": "Present", "actual_value": "All Present"},
                {"rule_id": "SUPPLIER_VERIFY", "name": "Supplier Master Verification", "status": "PASS", "reason": "Supplier verified with ID #1", "expected_value": sup1.supplier_name, "actual_value": sup1.supplier_name},
                {"rule_id": "GSTIN_CHECK", "name": "GSTIN Syntax & Portal Check", "status": "PASS", "reason": "Valid GSTIN format and active status verified.", "expected_value": "Valid Active", "actual_value": "Active"},
                {"rule_id": "PO_VERIFY", "name": "Purchase Order Matching", "status": "PASS", "reason": "PO #PO-2026-8801 matched perfectly (₹25,000.00).", "expected_value": "₹25,000.00", "actual_value": "₹25,000.00"},
                {"rule_id": "AMOUNT_CHECK", "name": "Mathematical Calculation Check", "status": "PASS", "reason": "Totals reconcile accurately.", "expected_value": "₹25,000.00", "actual_value": "₹25,000.00"},
                {"rule_id": "DUPLICATE_CHECK", "name": "Duplicate Invoice Detection", "status": "PASS", "reason": "No duplicate records detected.", "expected_value": "Unique", "actual_value": "Unique"}
            ]
        )
        db.add(val1)

    if not db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == "INV-1001").first():
        fr1 = FraudAnalysis(
            invoice_id="INV-1001",
            risk_score=8.0,
            risk_category="LOW",
            detected_issues=[],
            explanation="Standard invoice. Verified supplier, matched PO, statutory GST, consistent line items."
        )
        db.add(fr1)

    if not db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == "INV-1001").first():
        snap1 = InvoiceSnapshot(
            invoice_id="INV-1001",
            version=1,
            snapshot_json={
                "invoice_id": "INV-1001",
                "supplier": {"name": "ABC Technologies Pvt Ltd", "gstin": "29ABCDE1234F1Z5"},
                "invoice_details": {"number": "ABC-2026-001", "date": "2026-10-30", "total_amount": 25000.0},
                "extraction": {"status": "COMPLETED", "confidence": 98.5},
                "validation": {"status": "PASSED", "errors": []},
                "fraud_analysis": {"risk_score": 8.0, "risk_category": "LOW", "issues": []},
                "approval": {"status": "PENDING"}
            },
            snapshot_hash="0x7f8ee178e22a4b89d09c61287eaf4120"
        )
        db.add(snap1)

    if not db.query(AuditLog).filter(AuditLog.invoice_id == "INV-1001").first():
        audit1 = AuditLog(
            invoice_id="INV-1001",
            user_id=employee_user.id if employee_user else None,
            action="INVOICE_UPLOADED",
            details={"file_name": "INV-1001-ABC.pdf", "size_bytes": 12450},
            record_hash="0x7f8e2e33e14589d"
        )
        db.add(audit1)

    # TEST 2: Duplicate Invoice (INV-1002)
    if not db.query(Invoice).filter(Invoice.id == "INV-1002").first():
        t2_inv = Invoice(
            id="INV-1002",
            invoice_number="ABC-2026-001",
            supplier_id=sup1.id,
            invoice_date="2026-10-30",
            due_date="2026-11-29",
            total_amount=25000.0,
            file_path=inv2_file,
            file_name="INV-1002-DUP.pdf",
            file_type="application/pdf",
            processing_status="COMPLETED",
            validation_status="FAILED",
            fraud_status="HIGH",
            approval_status="ESCALATED",
            uploaded_by=employee_user.id if employee_user else None
        )
        db.add(t2_inv)
        db.commit()

    if not db.query(ExtractionResult).filter(ExtractionResult.invoice_id == "INV-1002").first():
        ext2 = ExtractionResult(
            invoice_id="INV-1002",
            extracted_data={
                "supplier": {"name": "ABC Technologies Pvt Ltd", "gstin": "29ABCDE1234F1Z5", "address": sup1.address, "contact": sup1.contact_details},
                "invoice_details": {"number": "ABC-2026-001", "date": "2026-10-30", "due_date": "2026-11-29", "po_number": "PO-2026-8801"},
                "items": [{"description": "Duplicate Submission - Cloud Suite", "quantity": 1, "unit_price": 21186.44, "tax": 3813.56, "total": 21186.44}],
                "financials": {"subtotal": 21186.44, "cgst": 1906.78, "sgst": 1906.78, "igst": 0.0, "grand_total": 25000.0},
                "overall_confidence": 98.0
            },
            confidence_scores={"supplier_name": 99.0, "invoice_number": 98.0, "grand_total": 98.5},
            ocr_text="TAX INVOICE ABC Technologies Pvt Ltd Invoice No: ABC-2026-001 Total: ₹25,000.00 Duplicate submission.",
            attempt_number=1,
            status="COMPLETED"
        )
        db.add(ext2)

    if not db.query(ValidationResult).filter(ValidationResult.invoice_id == "INV-1002").first():
        val2 = ValidationResult(
            invoice_id="INV-1002",
            validation_status="FAILED",
            validation_details=[
                {"rule_id": "REQ_FIELDS", "name": "Required Field Validation", "status": "PASS", "reason": "All fields present.", "expected_value": "Present", "actual_value": "All Present"},
                {"rule_id": "DUPLICATE_CHECK", "name": "Duplicate Invoice Detection", "status": "FAIL", "reason": "Duplicate invoice number ABC-2026-001 already processed under INV-1001.", "expected_value": "Unique", "actual_value": "Duplicate of INV-1001"}
            ]
        )
        db.add(val2)

    if not db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == "INV-1002").first():
        fr2 = FraudAnalysis(
            invoice_id="INV-1002",
            risk_score=85.0,
            risk_category="HIGH",
            detected_issues=["Duplicate invoice number resubmitted", "Identical billing amount within 24 hours"],
            explanation="Critical risk: Identical invoice number and billing amount matches previously submitted invoice INV-1001. Escalated to prevent double payment."
        )
        db.add(fr2)

    if not db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == "INV-1002").first():
        snap2 = InvoiceSnapshot(
            invoice_id="INV-1002",
            version=1,
            snapshot_json={"invoice_id": "INV-1002", "status": "FAILED", "fraud_status": "HIGH"},
            snapshot_hash="0x8e2b9f71c431a0e"
        )
        db.add(snap2)

    if not db.query(AuditLog).filter(AuditLog.invoice_id == "INV-1002").first():
        audit2 = AuditLog(
            invoice_id="INV-1002",
            user_id=employee_user.id if employee_user else None,
            action="DUPLICATE_FLAGGED_ESCALATED",
            details={"duplicate_of": "INV-1001", "risk_score": 85.0},
            record_hash="0x8e2b9f71c431a0e"
        )
        db.add(audit2)

    # TEST 3: Approved Invoice (INV-1003)
    if not db.query(Invoice).filter(Invoice.id == "INV-1003").first():
        t3_inv = Invoice(
            id="INV-1003",
            invoice_number="APX-99042",
            supplier_id=sup2.id,
            invoice_date="2026-10-28",
            due_date="2026-11-28",
            total_amount=118000.0,
            file_path=inv3_file,
            file_name="INV-1003-APEX.pdf",
            file_type="application/pdf",
            processing_status="COMPLETED",
            validation_status="PASSED",
            fraud_status="LOW",
            approval_status="APPROVED",
            uploaded_by=employee_user.id if employee_user else None
        )
        db.add(t3_inv)
        db.commit()

    if not db.query(ExtractionResult).filter(ExtractionResult.invoice_id == "INV-1003").first():
        ext3 = ExtractionResult(
            invoice_id="INV-1003",
            extracted_data={
                "supplier": {"name": "Apex Global Innovations", "gstin": "27AABCT2345Q1ZS", "address": sup2.address, "contact": sup2.contact_details},
                "invoice_details": {"number": "APX-99042", "date": "2026-10-28", "due_date": "2026-11-28", "po_number": "PO-2026-8802"},
                "items": [{"description": "Enterprise Annual AI License", "quantity": 1, "unit_price": 100000.0, "tax": 18000.0, "total": 100000.0}],
                "financials": {"subtotal": 100000.0, "cgst": 9000.0, "sgst": 9000.0, "igst": 0.0, "grand_total": 118000.0},
                "overall_confidence": 99.0
            },
            confidence_scores={"supplier_name": 99.5, "invoice_number": 99.0, "grand_total": 99.0},
            ocr_text="TAX INVOICE Apex Global Innovations GSTIN: 27AABCT2345Q1ZS Invoice No: APX-99042 Total: ₹1,18,000.00",
            attempt_number=1,
            status="COMPLETED"
        )
        db.add(ext3)

    if not db.query(ValidationResult).filter(ValidationResult.invoice_id == "INV-1003").first():
        val3 = ValidationResult(
            invoice_id="INV-1003",
            validation_status="PASSED",
            validation_details=[
                {"rule_id": "REQ_FIELDS", "name": "Required Field Validation", "status": "PASS", "reason": "All fields verified.", "expected_value": "Present", "actual_value": "All Present"},
                {"rule_id": "PO_VERIFY", "name": "Purchase Order Matching", "status": "PASS", "reason": "Matched PO #PO-2026-8802 (₹1,18,000.00).", "expected_value": "₹1,18,000.00", "actual_value": "₹1,18,000.00"}
            ]
        )
        db.add(val3)

    if not db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == "INV-1003").first():
        fr3 = FraudAnalysis(
            invoice_id="INV-1003",
            risk_score=12.0,
            risk_category="LOW",
            detected_issues=[],
            explanation="Low risk. Verified enterprise vendor, matched PO, statutory GST, legitimate annual software contract."
        )
        db.add(fr3)

    if not db.query(Approval).filter(Approval.invoice_id == "INV-1003").first():
        app3 = Approval(
            invoice_id="INV-1003",
            manager_id=manager_user.id if manager_user else 1,
            decision="APPROVED",
            reason="Verified enterprise license renewal against approved IT budget."
        )
        db.add(app3)

    if not db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == "INV-1003").first():
        snap3 = InvoiceSnapshot(
            invoice_id="INV-1003",
            version=1,
            snapshot_json={"invoice_id": "INV-1003", "status": "APPROVED", "total_amount": 118000.0},
            snapshot_hash="0x9a3bc4728d11e40"
        )
        db.add(snap3)

    if not db.query(AuditLog).filter(AuditLog.invoice_id == "INV-1003").first():
        audit3 = AuditLog(
            invoice_id="INV-1003",
            user_id=manager_user.id if manager_user else None,
            action="INVOICE_APPROVED",
            details={"decision": "APPROVED", "reason": "Verified enterprise license renewal."},
            record_hash="0x9a3bc4728d11e40"
        )
        db.add(audit3)

    # TEST 4: High Value / Suspicious Invoice (INV-1004)
    if not db.query(Invoice).filter(Invoice.id == "INV-1004").first():
        t4_inv = Invoice(
            id="INV-1004",
            invoice_number="NXG-7712",
            supplier_id=sup3.id,
            invoice_date="2026-10-29",
            due_date="2026-11-15",
            total_amount=850000.0,
            file_path=inv4_file,
            file_name="INV-1004-RISK.pdf",
            file_type="application/pdf",
            processing_status="COMPLETED",
            validation_status="WARNING",
            fraud_status="HIGH",
            approval_status="PENDING",
            uploaded_by=employee_user.id if employee_user else None
        )
        db.add(t4_inv)
        db.commit()

    if not db.query(ExtractionResult).filter(ExtractionResult.invoice_id == "INV-1004").first():
        ext4 = ExtractionResult(
            invoice_id="INV-1004",
            extracted_data={
                "supplier": {"name": "NextGen Enterprise Solutions", "gstin": "07AAACN5678P1ZQ", "address": sup3.address, "contact": sup3.contact_details},
                "invoice_details": {"number": "NXG-7712", "date": "2026-10-29", "due_date": "2026-11-15", "po_number": "PO-2026-8803"},
                "items": [{"description": "Emergency Data Center Migration Services", "quantity": 1, "unit_price": 850000.0, "tax": 0.0, "total": 850000.0}],
                "financials": {"subtotal": 850000.0, "cgst": 0.0, "sgst": 0.0, "igst": 0.0, "grand_total": 850000.0},
                "overall_confidence": 96.0
            },
            confidence_scores={"supplier_name": 98.0, "invoice_number": 97.0, "grand_total": 96.0},
            ocr_text="TAX INVOICE NextGen Enterprise Solutions Invoice No: NXG-7712 Total: ₹850,000.00 Emergency Services",
            attempt_number=1,
            status="COMPLETED"
        )
        db.add(ext4)

    if not db.query(ValidationResult).filter(ValidationResult.invoice_id == "INV-1004").first():
        val4 = ValidationResult(
            invoice_id="INV-1004",
            validation_status="WARNING",
            validation_details=[
                {"rule_id": "PO_VERIFY", "name": "Purchase Order Matching", "status": "WARNING", "reason": "Amount ₹850,000 exceeds PO #PO-2026-8803 expected amount (₹50,000.00).", "expected_value": "₹50,000.00", "actual_value": "₹850,000.00"},
                {"rule_id": "AMOUNT_THRESHOLD", "name": "High Value Threshold", "status": "WARNING", "reason": "Invoice exceeds corporate single-sign-off limit.", "expected_value": "≤ ₹2,00,000.00", "actual_value": "₹850,000.00"}
            ]
        )
        db.add(val4)

    if not db.query(FraudAnalysis).filter(FraudAnalysis.invoice_id == "INV-1004").first():
        fr4 = FraudAnalysis(
            invoice_id="INV-1004",
            risk_score=78.0,
            risk_category="HIGH",
            detected_issues=["Unusually high invoice amount exceeding PO allocation (+1600%)", "Single-line item without sub-breakdown"],
            explanation="High fraud risk. Significant budget variance without matched purchase order approval requires dual-management authorization."
        )
        db.add(fr4)

    if not db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == "INV-1004").first():
        snap4 = InvoiceSnapshot(
            invoice_id="INV-1004",
            version=1,
            snapshot_json={"invoice_id": "INV-1004", "status": "PENDING", "fraud_status": "HIGH", "total_amount": 850000.0},
            snapshot_hash="0xc4f17822a1b099d"
        )
        db.add(snap4)

    if not db.query(AuditLog).filter(AuditLog.invoice_id == "INV-1004").first():
        audit4 = AuditLog(
            invoice_id="INV-1004",
            user_id=employee_user.id if employee_user else None,
            action="HIGH_RISK_FLAGGED",
            details={"risk_score": 78.0, "reason": "Amount exceeds PO allocation by 1600%"},
            record_hash="0xc4f17822a1b099d"
        )
        db.add(audit4)

    # 6. Notifications
    if not db.query(Notification).first() and manager_user:
        notif1 = Notification(
            user_id=manager_user.id,
            invoice_id="INV-1001",
            message="Invoice INV-1001 (ABC-2026-001) is ready for manager approval review.",
            notification_type="INFO",
            read_status=False
        )
        notif2 = Notification(
            user_id=manager_user.id,
            invoice_id="INV-1004",
            message="HIGH RISK ALERT: Invoice INV-1004 (₹850,000.00) flagged for elevated fraud review.",
            notification_type="URGENT",
            read_status=False
        )
        db.add_all([notif1, notif2])

    db.commit()
    print("Database successfully verified and seeded with complete realistic test cases.")

def migrate_sqlite_columns():
    """Safely adds missing RBAC columns to existing SQLite tables if not present."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check users table columns
            user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)"))]
            if "is_active" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            if "department" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'General'"))
            if "approval_limit" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN approval_limit FLOAT DEFAULT 100000.0"))

            # Check invoices table columns
            inv_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(invoices)"))]
            if "department" not in inv_cols:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN department VARCHAR(100) DEFAULT 'General'"))
            if "assigned_manager_id" not in inv_cols:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN assigned_manager_id INTEGER REFERENCES users(id)"))
            conn.commit()
    except Exception as e:
        print(f"Column migration notice (normal if fresh DB): {e}")

def init_database():
    """Initializes SQLite tables safely and seeds baseline demo records."""
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_columns()
    db = SessionLocal()
    try:
        seed_demo_data(db, force_reset_demo=False)
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
