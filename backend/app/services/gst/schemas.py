from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SupplyType(str, Enum):
    INTRA_STATE = "INTRA_STATE"               # Same state: CGST + SGST
    UNION_TERRITORY = "UNION_TERRITORY"       # UT without legislature: CGST + UTGST
    INTER_STATE = "INTER_STATE"               # Different state: IGST
    EXPORT_ZERO_RATED = "EXPORT_ZERO_RATED"   # Zero rated export
    UNSUPPORTED = "UNSUPPORTED"               # RCM, non-GST, or unresolvable place of supply

class GSTStatus(str, Enum):
    PASS = "PASS"
    MISMATCH = "MISMATCH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    UNSUPPORTED = "UNSUPPORTED"
    DISABLED = "DISABLED"

class GSTLineItemInput(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    taxable_amount: Optional[float] = None
    tax_rate: Optional[float] = None          # e.g., 0.18 for 18%
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    utgst: Optional[float] = None
    igst: Optional[float] = None
    total_amount: Optional[float] = None
    is_inclusive: bool = False

class GSTLineItemResult(BaseModel):
    description: str
    quantity: float
    unit_price: float
    taxable_amount: float
    tax_rate: float
    cgst: float = 0.0
    sgst: float = 0.0
    utgst: float = 0.0
    igst: float = 0.0
    total_tax: float = 0.0
    line_total: float = 0.0
    is_inclusive: bool = False

class TaxBreakdown(BaseModel):
    taxable_amount: float = 0.0
    cgst: float = 0.0
    sgst: float = 0.0
    utgst: float = 0.0
    igst: float = 0.0
    total_tax: float = 0.0
    grand_total: float = 0.0

class GSTDiscrepancy(BaseModel):
    code: str
    field: str
    message: str
    expected: Any
    actual: Any
    severity: str = "ERROR"                   # ERROR or WARNING

class GSTResult(BaseModel):
    status: GSTStatus
    supply_type: SupplyType
    supplier_state: Optional[str] = None
    supplier_state_code: Optional[str] = None
    recipient_state: Optional[str] = None
    recipient_state_code: Optional[str] = None
    is_utgst_applicable: bool = False
    
    # Financial reconciliation
    calculated_breakdown: TaxBreakdown
    extracted_breakdown: Optional[TaxBreakdown] = None
    variance: Dict[str, float] = Field(default_factory=dict)
    
    # Discrepancies & explainability
    discrepancies: List[GSTDiscrepancy] = Field(default_factory=list)
    line_item_results: List[GSTLineItemResult] = Field(default_factory=list)
    explanation: str
    recommendation: str
    requires_human_review: bool = False
