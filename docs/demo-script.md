# InvoiceGuard Hackathon Judge Demonstration Script

A structured 5-to-7 minute walkthrough for national hackathon evaluation, demonstrating the end-to-end autonomous accounts payable verification pipeline, independent dual-engine audit, and cryptographic segregation of duties.

---

## Pre-Flight Check (30 seconds before presenting)

1. **Open Frontend**: `http://localhost:5173/` or production URL.
2. **Verify Backend Status**:
   - Check the top right server status indicator (Green pulse: "API ONLINE").
   - If Render Free was asleep, the `ServerStatusBanner` displays cold-start progress with auto-retry.
3. **Reset to Clean Baseline (Optional)**:
   - Run `python scripts/seed-demo.py --reset` or trigger `POST /api/demo/reset`.
   - Baseline invoices seeded:
     - `INV-1001` (Clean standard invoice, 98% OCR confidence, Approved)
     - `INV-1002` (Quantity mismatch with PO-2026-0881, Flagged Discrepancy)
     - `INV-1003` (Price inflation anomaly 145% above historical unit price, High Risk)
     - `INV-1004` (Unregistered vendor / GSTIN mismatch, Pending Review)

---

## 10-Step Judge Flow

### Step 1: AP Executive Overview (`/` or `/dashboard`)
- **Action**: Land on the Overview Dashboard.
- **Highlight to Judge**:
  - Compact **KPI Strip** displaying real-time metrics: Total Processed (`₹4,72,000+`), Pending Approvals, Flagged Risks, and Pass Rate.
  - **Pipeline Stepper**: 6 stages showing exact invoice counts at Ingestion, Extraction, Validation, Risk Check, Executive Approval, and ERP Dispatch.
  - **Live Audit Stream**: Real-time event ticker on the bottom right tracking incoming mutations.

### Step 2: Global Search & Navigation
- **Action**: Press `/` or `Ctrl + K` or click the search box in the Top Bar.
- **Highlight to Judge**:
  - Live modal search querying both invoice numbers (`INV-1002`) and supplier names (`Nexus Hardware`).
  - Notice the **Role Switcher** in the Top Bar: Switch between `Manager`, `Employee`, and `Admin` to demonstrate strict Segregation of Duties (SoD).

### Step 3: Invoices Master Ledger (`/invoices`)
- **Action**: Navigate to `/invoices` from the sidebar.
- **Highlight to Judge**:
  - Full tabular ledger with Indian Rupee formatting (`formatINR`), `StatusBadge` indicators (never color alone), and risk badges.
  - Instant client-side search and status/risk filters.
  - **Export CSV** button: Generates a complete verified AP compliance export.

### Step 4: Real Document Ingestion (`/upload`)
- **Action**: Navigate to `/upload`. Drag & drop a sample PDF or click "Upload New Invoice".
- **Highlight to Judge**:
  - Real processing state (no fake timed spinners or synthetic delays).
  - Document size and MIME type client-side validation.
  - Immediate summary card upon completion with direct link to the Review Workbench.

### Step 5: Split-Pane Review Workbench (`/extraction?invoiceId=INV-1002`)
- **Action**: Navigate to `/extraction?invoiceId=INV-1002`.
- **Highlight to Judge**:
  - Left Pane: Actual original PDF document preview with zoom and download.
  - Right Pane: Extracted structured financial data with field-by-field **Confidence Chips** (Green $\ge 90\%$, Amber $70-89\%$, Red $< 70\%$).
  - **Verification Checklist**: Below the split-pane, an interactive checklist evaluates the independent checker, 3-way match, and arithmetic integrity.

### Step 6: Human-in-the-Loop Field Correction & Re-Verification
- **Action**: Click **"Edit Fields"** on `INV-1002`. Correct a line item quantity or price. Click **"Save & Re-Verify"**.
- **Highlight to Judge**:
  - Point out that editing extracted data does *not* blindly accept values. It flags the invoice as **"Verification Pending"** and automatically invokes `PUT /invoices/{id}/extraction` to re-trigger validation and fraud analysis in the background.

### Step 7: Dual-Layer Verification Workbench (`/verification?invoiceId=INV-1003`)
- **Action**: Navigate to `/verification` (or click Verification in sidebar). Select `INV-1003`.
- **Highlight to Judge**:
  - **Left Section (Deterministic Rules)**: Zero-hallucination checks including PO verification, arithmetic validation, and GSTIN master compliance.
  - **Right Section (Statistical AI Risk Engine)**: Multivariate anomaly risk gauge (`78/100 HIGH RISK`), price deviation outlier detection, and an **Explainable AI Audit Narrative**.
  - Emphasize that deterministic rule math is separated from generative/statistical AI scores.

### Step 8: Executive Approval Desk & Segregation of Duties (`/approvals`)
- **Action**: Navigate to `/approvals`. Click on pending invoice `INV-1002`.
- **Highlight to Judge**:
  - Notice the **Segregation of Duties (SoD) Banner**:
    - If logged in as an Employee: The "Approve" button is disabled with notice: *"Only Accounts Payable Managers can authorize invoice disbursements."*
    - If the invoice was uploaded by the user: The button is disabled with notice: *"Uploader cannot approve their own invoice."*
    - If the independent checker failed: Approval is blocked until flagged discrepancies are resolved.
  - Switch role to `Manager` in the Top Bar.
  - Click **"Reject Invoice"** or **"Escalate to CFO"**: Notice the **mandatory justification modal** requiring at least 5 characters of explanation.

### Step 9: Reconciled Spend Analytics (`/analytics` or `/reports`)
- **Action**: Navigate to `/analytics`.
- **Highlight to Judge**:
  - Aggregated vendor disbursement chart with horizontal spend bars in Indian Rupees (`₹`).
  - Approval decisions distribution donut chart.
  - Filterable compliance data table with one-click **Executive PDF** export.

### Step 10: Tamper-Evident SHA-256 Audit Trail (`/audit-logs`)
- **Action**: Navigate to `/audit-logs`.
- **Highlight to Judge**:
  - Append-only cryptographic ledger tracking every single ingestion, human correction, rule evaluation, and manager approval.
  - Truncated SHA-256 cryptographic hashes with one-click copy to clipboard.
  - Honest audit notice: Demonstrates transparent engineering without claiming non-existent enterprise Merkle endpoints.

---

## Key Talking Points for Judges

1. **Zero Hallucination Financial Math**:
   - Extraction fields are audited by an independent two-pass checker.
   - Core compliance (three-way PO match, GST arithmetic, tax sum) is evaluated deterministically in Python/SQL, never left to LLM guesswork.
2. **Real Enterprise AP Controls**:
   - Strict segregation of duties (SoD), role-based permissions, and versioned snapshots prevent fraud and internal unauthorized disbursements.
3. **Resilience & Production Readiness**:
   - Cold-start handling for serverless backends, optimistic caching, dark-light enterprise tokens, and full responsive support across desktop and mobile.
