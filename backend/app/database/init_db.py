import os
import datetime
import fitz  # PyMuPDF
from app.database.session import Base, engine, SessionLocal
from app.models.models import (
    User, Supplier, PurchaseOrder, Invoice, InvoiceItem,
    ExtractionResult, ValidationResult, FraudAnalysis, Approval,
    AuditLog, Notification, InvoiceSnapshot, AutomationLog
)
from app.core.security import get_password_hash
from app.core.config import settings

def create_sample_pdf(file_path: str, title: str, inv_number: str, supplier_name: str, gstin: str, total_str: str, items_list: list):
    """Generates a real PDF file on disk with clear invoice layout."""
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

def init_database():
    """Initializes tables and seeds initial users, suppliers, POs, and test invoices."""
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).first() is not None:
        db.close()
        return

    print("Seeding initial users...")
    admin_user = User(
        name="Admin User",
        email="admin@invoiceguard.ai",
        password_hash=get_password_hash("Admin@123"),
        role="admin"
    )
    employee_user = User(
        name="Alex Employee",
        email="employee@invoiceguard.ai",
        password_hash=get_password_hash("Employee@123"),
        role="employee"
    )
    manager_user = User(
        name="Sarah Manager",
        email="manager@invoiceguard.ai",
        password_hash=get_password_hash("Manager@123"),
        role="manager"
    )
    db.add_all([admin_user, employee_user, manager_user])
    db.commit()

    print("Seeding registered suppliers...")
    sup1 = Supplier(
        supplier_name="ABC Technologies Pvt Ltd",
        gstin="29ABCDE1234F1Z5",
        address="701, Tech Cyber Gateway, Outer Ring Rd, Bengaluru, Karnataka 560103",
        contact_details="+91 80 4123 9000 | accounts@abctech.in"
    )
    sup2 = Supplier(
        supplier_name="Apex Global Innovations",
        gstin="27AABCT2345Q1ZS",
        address="Tower 4, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
        contact_details="+91 22 6789 1100 | billing@apexinnovations.com"
    )
    sup3 = Supplier(
        supplier_name="NextGen Enterprise Solutions",
        gstin="07AAACN5678P1ZQ",
        address="Plot 18, Connaught Place, New Delhi 110001",
        contact_details="+91 11 2345 6789 | finance@nextgensolutions.in"
    )
    sup4 = Supplier(
        supplier_name="Zenith Hardware & Networking",
        gstin="33AAACZ9876R1ZM",
        address="Mount Road, Anna Salai, Chennai, Tamil Nadu 600002",
        contact_details="+91 44 2850 4000 | sales@zenithhardware.com"
    )
    db.add_all([sup1, sup2, sup3, sup4])
    db.commit()

    print("Seeding purchase orders...")
    po1 = PurchaseOrder(po_number="PO-2026-8801", supplier_id=sup1.id, expected_amount=25000.0, status="OPEN")
    po2 = PurchaseOrder(po_number="PO-2026-8802", supplier_id=sup2.id, expected_amount=118000.0, status="OPEN")
    po3 = PurchaseOrder(po_number="PO-2026-8803", supplier_id=sup3.id, expected_amount=50000.0, status="OPEN")
    po4 = PurchaseOrder(po_number="PO-2026-8804", supplier_id=sup4.id, expected_amount=84500.0, status="OPEN")
    db.add_all([po1, po2, po3, po4])
    db.commit()

    print("Creating sample invoice PDF documents...")
    # Generate test invoice files
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

    # Seed TEST 1: Valid Invoice
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
        uploaded_by=employee_user.id
    )
    db.add(t1_inv)
    db.commit()

    # Extraction for Test 1
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

    # Validation for Test 1
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

    # Fraud analysis for Test 1
    fr1 = FraudAnalysis(
        invoice_id="INV-1001",
        risk_score=8.0,
        risk_category="LOW",
        detected_issues=[],
        explanation="Standard invoice. Verified supplier, matched PO, statutory GST, consistent line items."
    )

    # Snapshot for Test 1
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

    # Seed TEST 2: Duplicate invoice
    t2_inv = Invoice(
        id="INV-1002",
        invoice_number="ABC-2026-001",  # Same invoice number as INV-1001!
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
        uploaded_by=employee_user.id
    )

    # Seed TEST 3: Approved Invoice
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
        uploaded_by=employee_user.id
    )

    # Seed TEST 4: Suspicious / High-Value Invoice
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
        uploaded_by=employee_user.id
    )

    db.add_all([ext1, val1, fr1, snap1, t2_inv, t3_inv, t4_inv])
    db.commit()

    # Add approvals & audits
    app3 = Approval(
        invoice_id="INV-1003",
        manager_id=manager_user.id,
        decision="APPROVED",
        reason="Verified enterprise license renewal against approved budget."
    )
    db.add(app3)

    # Add Audit logs with hashes
    audit1 = AuditLog(
        invoice_id="INV-1001",
        user_id=employee_user.id,
        action="INVOICE_UPLOADED",
        details={"file_name": "INV-1001-ABC.pdf", "size_bytes": 12450},
        record_hash="0x7f8e2e33e14589d"
    )
    audit2 = AuditLog(
        invoice_id="INV-1001",
        user_id=None,
        action="OCR_AND_AI_EXTRACTION_COMPLETED",
        details={"confidence": 98.5, "status": "COMPLETED"},
        record_hash="0x8f1e994821a81dc"
    )
    audit3 = AuditLog(
        invoice_id="INV-1003",
        user_id=manager_user.id,
        action="INVOICE_APPROVED",
        details={"decision": "APPROVED", "reason": "Verified enterprise license renewal."},
        record_hash="0x9a3bc4728d11e40"
    )
    db.add_all([audit1, audit2, audit3])

    # Add initial notification
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
    db.close()
    print("Database successfully initialized and seeded with complete realistic test cases.")

if __name__ == "__main__":
    init_database()
