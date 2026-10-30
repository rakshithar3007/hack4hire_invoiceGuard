export type UserRole = 'admin' | 'employee' | 'manager';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  department?: string;
  approval_limit?: number | null;
  permissions?: string[];
  created_at: string;
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  supplier_id?: number;
  supplier_name?: string;
  supplier_gstin?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount?: number;
  file_path: string;
  file_name: string;
  file_type: string;
  processing_status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL_INVESTIGATION';
  validation_status: 'PENDING' | 'PASSED' | 'WARNING' | 'FAILED';
  fraud_status: 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  uploaded_by?: number;
  uploader_name?: string;
  assigned_manager_id?: number;
  department?: string;
  created_at: string;
  updated_at?: string;
  items?: InvoiceItem[];
}

export interface ExtractionResult {
  id: number;
  invoice_id: string;
  extracted_data: {
    supplier: {
      name: string;
      gstin: string;
      address: string;
      contact: string;
    };
    invoice_details: {
      number: string;
      date: string;
      due_date: string;
      po_number: string;
    };
    items: InvoiceItem[];
    financials: {
      subtotal: number;
      cgst: number;
      sgst: number;
      igst: number;
      other_taxes: number;
      grand_total: number;
    };
    overall_confidence: number;
  };
  confidence_scores: Record<string, number>;
  ocr_text?: string;
  attempt_number: number;
  status: string;
  created_at: string;
}

export interface ValidationRule {
  rule_id: string;
  name: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'PENDING';
  reason: string;
  expected_value?: string;
  actual_value?: string;
}

export interface ValidationResult {
  id?: number;
  invoice_id: string;
  validation_status: 'PASSED' | 'WARNING' | 'FAILED';
  validation_details: ValidationRule[];
  created_at?: string;
}

export interface DetectedAnomaly {
  code: string;
  title: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface FraudAnalysis {
  id?: number;
  invoice_id: string;
  risk_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  detected_issues: DetectedAnomaly[];
  explanation?: string;
  recommended_action?: string;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  invoice_id?: string;
  user_id?: number;
  user_name?: string;
  action: string;
  details?: any;
  record_hash?: string;
  timestamp: string;
}

export interface InvoiceSnapshot {
  id: number;
  invoice_id: string;
  version: number;
  snapshot_json: any;
  snapshot_hash?: string;
  created_at: string;
}

export interface AppNotification {
  id: number;
  user_id?: number;
  invoice_id?: string;
  message: string;
  notification_type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
  read_status: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_invoices: number;
  processed_invoices: number;
  approved_invoices: number;
  pending_invoices: number;
  rejected_invoices: number;
  flagged_invoices: number;
  total_spend: number;
  avg_confidence: number;
}
