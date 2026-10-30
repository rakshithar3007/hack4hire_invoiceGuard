import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="employee")  # admin, employee, manager
    is_active = Column(Boolean, default=True, nullable=False)
    department = Column(String(100), default="General", nullable=False)
    approval_limit = Column(Float, default=100000.0, nullable=True)  # Manager limit in INR (None/0 for unlimited or NA)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoices_uploaded = relationship("Invoice", foreign_keys="[Invoice.uploaded_by]", back_populates="uploader")
    invoices_assigned = relationship("Invoice", foreign_keys="[Invoice.assigned_manager_id]", back_populates="assigned_manager")
    approvals_made = relationship("Approval", back_populates="manager")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(200), nullable=False, index=True)
    gstin = Column(String(50), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    contact_details = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoices = relationship("Invoice", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    expected_amount = Column(Float, nullable=False)
    status = Column(String(50), default="OPEN")  # OPEN, FULFILLED, CANCELLED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="purchase_orders")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String(50), primary_key=True, index=True)  # e.g. "INV-1001"
    invoice_number = Column(String(100), index=True, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    invoice_date = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=True)
    total_amount = Column(Float, nullable=True, default=0.0)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    
    # Status fields
    processing_status = Column(String(50), default="UPLOADED")  # UPLOADED, PROCESSING, COMPLETED, FAILED, MANUAL_INVESTIGATION
    validation_status = Column(String(50), default="PENDING")   # PENDING, PASSED, WARNING, FAILED
    fraud_status = Column(String(50), default="PENDING")        # PENDING, LOW, MEDIUM, HIGH
    approval_status = Column(String(50), default="PENDING")     # PENDING, APPROVED, REJECTED, ESCALATED
    
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department = Column(String(100), default="General", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="invoices_uploaded")
    assigned_manager = relationship("User", foreign_keys=[assigned_manager_id], back_populates="invoices_assigned")
    supplier = relationship("Supplier", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    extraction_results = relationship("ExtractionResult", back_populates="invoice", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="invoice", cascade="all, delete-orphan")
    fraud_analyses = relationship("FraudAnalysis", back_populates="invoice", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="invoice", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="invoice", cascade="all, delete-orphan")
    snapshots = relationship("InvoiceSnapshot", back_populates="invoice", cascade="all, delete-orphan")
    automation_logs = relationship("AutomationLog", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    invoice = relationship("Invoice", back_populates="items")

class ExtractionResult(Base):
    __tablename__ = "extraction_results"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    extracted_data = Column(JSON, nullable=False)
    confidence_scores = Column(JSON, nullable=False)
    ocr_text = Column(Text, nullable=True)
    attempt_number = Column(Integer, default=1)
    status = Column(String(50), default="COMPLETED")  # COMPLETED, FAILED, PARTIAL
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="extraction_results")

class ValidationResult(Base):
    __tablename__ = "validation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    validation_status = Column(String(50), nullable=False)  # PASSED, WARNING, FAILED
    validation_details = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="validation_results")

class FraudAnalysis(Base):
    __tablename__ = "fraud_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_category = Column(String(50), nullable=False)  # LOW, MEDIUM, HIGH
    detected_issues = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="fraud_analyses")

class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(50), nullable=False)  # APPROVED, REJECTED, ESCALATED
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="approvals")
    manager = relationship("User", back_populates="approvals_made")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    record_hash = Column(String(100), nullable=True)  # Cryptographic hash for immutability verification
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invoice_id = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="INFO")  # INFO, WARNING, SUCCESS, URGENT
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class InvoiceSnapshot(Base):
    __tablename__ = "invoice_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=False)
    version = Column(Integer, default=1)
    snapshot_json = Column(JSON, nullable=False)
    snapshot_hash = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="snapshots")

class AutomationLog(Base):
    __tablename__ = "automation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), nullable=True)
    workflow_name = Column(String(100), nullable=False)
    execution_status = Column(String(50), nullable=False)  # SUCCESS, FAILED, RETRY
    execution_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="automation_logs")
