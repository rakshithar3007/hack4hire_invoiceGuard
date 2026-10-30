# InvoiceGuard AI - Enterprise User Guide

## Overview

InvoiceGuard AI automates the end-to-end lifecycle of enterprise invoice processing:
1. Ingestion of PDFs and images
2. PyMuPDF OCR text extraction & spatial token mapping
3. AI structured field parsing with 0-100% field confidence indicators
4. Deterministic 8-rule business validation
5. Multivariate fraud risk assessment (0-100 score) with transparent explainability
6. Manager approval workflow with tamper-proof audit trails and cryptographic JSON snapshots
7. n8n automation and daily scheduled follow-up orchestration

---

## User Roles & Permissions

| Role | Permissions | Demo Account |
| :--- | :--- | :--- |
| **Admin** | Full system control, user management, vendor master CRUD, PO master CRUD, view all logs and reports | `admin@invoiceguard.ai` / `Admin@123` |
| **Manager** | Review pending invoices, approve disbursements, reject with mandatory reason, escalate suspicious invoices | `manager@invoiceguard.ai` / `Manager@123` |
| **Employee** | Upload invoices, inspect extracted fields, correct field values manually, trigger re-extractions | `employee@invoiceguard.ai` / `Employee@123` |

---

## Step-by-Step Workflows

### 1. Uploading an Invoice
1. Click **Upload Invoice** on the top navigation bar or drag files onto the Dashboard dropzone.
2. Select any PDF, PNG, JPG, or JPEG (up to 25MB).
3. The platform automatically triggers OCR, AI extraction, validation, fraud scoring, snapshot generation, and n8n notification.

### 2. Reviewing & Correcting Extracted Fields
1. Navigate to **Extraction** (`/extraction`).
2. The left pane shows the visual document layout with interactive teal bounding boxes.
3. The right pane shows extracted values alongside their confidence badges:
   - **Green (>= 80%)**: High confidence.
   - **Yellow (50%–79%)**: Medium confidence.
   - **Red (< 50%)**: Low confidence.
4. Click **Edit Fields Manually** to correct any field, then click **Save & Revalidate**.
5. Inspect the **Independent Checker** status card ("CHECKER PASSED?"). If discrepancies exist, click **Run Re-Extraction** (tracks up to 3 attempts before escalating to Manual Investigation).

### 3. Reviewing Business Validation Rules
1. Navigate to **Business Validation** (`/validation`).
2. The **Action Tool Checklist** evaluates:
   - Mandatory field presence
   - Vendor master registration
   - Statutory 15-digit GSTIN syntax
   - Invoice number structure
   - Purchase Order (PO) matching and tolerance
   - Mathematical consistency (Subtotal + Tax = Grand Total)
   - Tax split consistency (equal CGST/SGST)
   - Duplicate invoice submission detection

### 4. Analyzing Fraud Risk
1. Navigate to **Fraud Detection** (`/fraud`).
2. Inspect the **Risk Score Gauge (0–100)**:
   - **0–29**: LOW RISK (Normal approval clearance).
   - **30–69**: MEDIUM RISK (Secondary review advised).
   - **70–100**: HIGH RISK (Escalation required; automated approval locked).
3. Review the **Explainable AI Narrative** for transparent reasoning behind every flagged anomaly.

### 5. Manager Approval & Rejection
1. Navigate to **Approval Management** (`/approvals`).
2. Review invoice parameters, confidence levels, and fraud flags.
3. Click **Approve** to authorize payment (High-risk invoices prompt for mandatory manager override justification).
4. Click **Reject** to decline the invoice; enter a mandatory rejection reason for audit logging.
5. Click **Escalate** to refer the invoice to forensic audit.
6. Click the code icon to inspect and download the **Cryptographic JSON Snapshot** with SHA-256 seal.

### 6. Reports & Audit Trail
- **Reports & Analytics** (`/reports`): Filter invoice records by vendor, status, or risk tier. Export clean CSV or formatted landscape PDF reports.
- **Audit Logs** (`/audit`): View the append-only cryptographic timeline where every action is chained with SHA-256 hashes for regulatory compliance.
