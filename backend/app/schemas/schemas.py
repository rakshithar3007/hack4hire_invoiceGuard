from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "employee"
    department: Optional[str] = "General"
    approval_limit: Optional[float] = None

class UserAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "employee"
    department: str = "General"
    approval_limit: Optional[float] = None

class UserRoleUpdate(BaseModel):
    role: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserLimitUpdate(BaseModel):
    approval_limit: float

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool = True
    department: str = "General"
    approval_limit: Optional[float] = None
    permissions: Optional[List[str]] = None
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    supplier_name: str
    gstin: str
    address: Optional[str] = None
    contact_details: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    contact_details: Optional[str] = None

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Purchase Order Schemas ---
class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    expected_amount: float
    status: Optional[str] = "OPEN"

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    expected_amount: Optional[float] = None
    status: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    created_at: datetime
    supplier_name: Optional[str] = None
    class Config:
        from_attributes = True

# --- Item Schemas ---
class InvoiceItemBase(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax: float = 0.0
    total: float = 0.0

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: str
    class Config:
        from_attributes = True

# --- Invoice Details & Extraction Schemas ---
class ExtractedSupplierDetails(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None

class ExtractedInvoiceDetails(BaseModel):
    number: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    po_number: Optional[str] = None

class ExtractedFinancialDetails(BaseModel):
    subtotal: Optional[float] = 0.0
    cgst: Optional[float] = 0.0
    sgst: Optional[float] = 0.0
    igst: Optional[float] = 0.0
    other_taxes: Optional[float] = 0.0
    grand_total: Optional[float] = 0.0

class StructuredExtractionData(BaseModel):
    supplier: ExtractedSupplierDetails
    invoice_details: ExtractedInvoiceDetails
    items: List[InvoiceItemBase] = []
    financials: ExtractedFinancialDetails

class FieldConfidence(BaseModel):
    value: Any
    confidence: float  # 0 to 100
    status: str  # high, medium, low

class ExtractionResultResponse(BaseModel):
    id: int
    invoice_id: str
    extracted_data: Dict[str, Any]
    confidence_scores: Dict[str, Any]
    ocr_text: Optional[str] = None
    attempt_number: int
    status: str
    gst_result: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ExtractionUpdateRequest(BaseModel):
    supplier_name: Optional[str] = None
    supplier_gstin: Optional[str] = None
    supplier_address: Optional[str] = None
    supplier_contact: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    po_number: Optional[str] = None
    items: Optional[List[InvoiceItemBase]] = None
    subtotal: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    grand_total: Optional[float] = None

class ReExtractRequest(BaseModel):
    strategy: Optional[str] = "heuristic_ai"  # "ocr_enhancement", "heuristic_ai", "alternative_patterns"

# --- Validation Schemas ---
class ValidationRuleItem(BaseModel):
    rule_id: str
    name: str
    status: str  # PASS, WARNING, FAIL, PENDING
    reason: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None

class ValidationResultResponse(BaseModel):
    id: Optional[int] = None
    invoice_id: str
    validation_status: str  # PASSED, WARNING, FAILED
    validation_details: List[ValidationRuleItem]
    created_at: Optional[datetime] = None

# --- Fraud Analysis Schemas ---
class DetectedAnomaly(BaseModel):
    code: str
    title: str
    risk_level: str  # LOW, MEDIUM, HIGH
    description: str

class FraudAnalysisResponse(BaseModel):
    id: Optional[int] = None
    invoice_id: str
    risk_score: float  # 0 to 100
    risk_category: str  # LOW, MEDIUM, HIGH
    detected_issues: List[DetectedAnomaly]
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    created_at: Optional[datetime] = None

# --- Invoice List & Summary Schemas ---
class InvoiceResponse(BaseModel):
    id: str
    invoice_number: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    supplier_gstin: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    total_amount: Optional[float] = 0.0
    file_path: str
    file_name: str
    file_type: str
    processing_status: str
    validation_status: str
    fraud_status: str
    approval_status: str
    uploaded_by: Optional[int] = None
    uploader_name: Optional[str] = None
    assigned_manager_id: Optional[int] = None
    department: Optional[str] = "General"
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []
    gst_result: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

# --- Approval Schemas ---
class ApprovalRequest(BaseModel):
    reason: Optional[str] = None

class ApprovalResponse(BaseModel):
    id: int
    invoice_id: str
    manager_id: int
    manager_name: Optional[str] = None
    decision: str
    reason: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    invoice_id: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    details: Optional[Any] = None
    record_hash: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True

# --- Snapshot Schemas ---
class InvoiceSnapshotResponse(BaseModel):
    id: int
    invoice_id: str
    version: int
    snapshot_json: Dict[str, Any]
    snapshot_hash: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    invoice_id: Optional[str] = None
    message: str
    notification_type: str
    read_status: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- Dashboard & Analytics Schemas ---
class DashboardStats(BaseModel):
    total_invoices: int
    processed_invoices: int
    approved_invoices: int
    pending_invoices: int
    rejected_invoices: int
    flagged_invoices: int
    total_spend: float
    avg_confidence: float

class MonthlyTrend(BaseModel):
    month: str
    invoices: int
    amount: float
    approved: int
    rejected: int

class FraudStat(BaseModel):
    category: str
    count: int

class DashboardAnalyticsResponse(BaseModel):
    monthly_trends: List[MonthlyTrend]
    approval_distribution: Dict[str, int]
    fraud_risk_distribution: Dict[str, int]
    validation_rates: Dict[str, int]
    supplier_spend: List[Dict[str, Any]]

# --- n8n Webhook Schemas ---
class N8nInvoiceEvent(BaseModel):
    event: str
    invoice_id: str
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = None
    validation_status: Optional[str] = None
    fraud_risk: Optional[str] = None
    approval_status: Optional[str] = None

class N8nNotificationResult(BaseModel):
    invoice_id: str
    workflow_id: Optional[str] = None
    execution_status: str
    details: Optional[Dict[str, Any]] = None
