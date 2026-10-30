# INVOICEGUARD AI
### AI-Powered Intelligent Invoice Processing, Business Validation and Fraud Detection Platform

InvoiceGuard AI is an intelligent, production-style invoice automation and fraud detection platform designed to streamline accounts payable workflows from ingestion to final disbursement sign-off.

---

## Key Features

1. **Document Ingestion & Multi-Format Parsing**:
   - Supports PDF, PNG, JPG, and JPEG formats (up to 25MB).
   - Real document extraction engine utilizing **PyMuPDF** and **OpenCV** with adaptive contrast enhancement and spatial token analysis.

2. **AI Structured Extraction & Field Confidence Scoring**:
   - Maps Supplier, Invoice, Item Details, and Financial Totals.
   - Individual confidence metrics per field (**Green >= 80%**, **Yellow 50%–79%**, **Red < 50%**).
   - Interactive document layout with teal bounding box visual overlays matching the reference design.
   - Real-time field correction with automated re-validation and snapshot versioning.

3. **Deterministic 8-Rule Business Validation Engine**:
   - Required mandatory fields verification
   - Registered vendor master lookup
   - Statutory 15-digit GSTIN syntax and status check
   - Invoice number structure verification
   - Purchase order (PO) budget reconciliation and tolerance check
   - Mathematical calculations (Subtotal + Tax = Grand Total)
   - Tax consistency check (CGST/SGST symmetry)
   - Duplicate invoice detection against previous submissions

4. **Independent Fraud Risk Engine & Explainable AI**:
   - Multivariate behavioral scoring (**0–100 score**; **Low 0–29**, **Medium 30–69**, **High 70–100**).
   - Detects pricing anomalies, round number spikes, PO overruns, rapid velocity bursts, and double-billing.
   - Transparent, human-readable narrative explaining *why* an invoice was flagged.
   - Safeguards preventing automatic sign-off on high-risk invoices without explicit manager override.

5. **Independent Checker & 3-Attempt Re-Extraction**:
   - Implements the "CHECKER PASSED?" decision diamond from the reference video.
   - Automatically tracks re-extraction strategies up to 3 attempts before escalating to Manual Investigation.

6. **Manager Approval Dashboard & Transactional Security**:
   - Role-based authorization for Managers and Admins.
   - Approvals, Rejections with mandatory reason tracking, and Compliance Escalation.
   - Row-level database locks preventing conflicting approval decisions.

7. **Cryptographic JSON Snapshots & Tamper-Proof Audit Logs**:
   - Generates structured JSON snapshots sealed with SHA-256 integrity hashes.
   - Version history and instant download support.
   - Append-only chained audit log ledger.

8. **n8n Automation Engine Integration**:
   - Direct integration with the provided 8-node n8n workflow architecture (*Webhook -> Validate -> IF Valid -> AI Analysis -> Notifications -> Daily Follow-up*).
   - Built-in interactive pipeline simulator in Settings with live step-by-step diagnostic trace.
   - Importable workflow JSON located in `n8n/workflows/invoiceguard_workflow.json`.

---

## Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide React, Recharts, Axios, React Router.
- **Backend**: Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2, Uvicorn.
- **Document Processing**: PyMuPDF, Pillow, OpenCV.
- **Security**: JWT Bearer Authentication, direct BCrypt password hashing, RBAC.
- **Database**: SQLite (local development) / PostgreSQL compatible.
- **Automation**: n8n, Webhooks, Scheduled Triggers, JSON payloads.

---

## Quick Start Instructions (Windows 11)

### 1. Prerequisites
- Python 3.11+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node.js 20)

### 2. Backend Setup
Open a terminal in `backend/`:
```bash
cd backend
pip install -r requirements.txt
python -m app.database.init_db
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger docs will be live at:
- API Root: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
Open a second terminal in `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
The React frontend dashboard will open at:
- Web App: `http://127.0.0.1:5173`

---

## Pre-Configured Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@invoiceguard.ai` | `Admin@123` | Master vendor & PO management, system settings, full audit |
| **Manager** | `manager@invoiceguard.ai` | `Manager@123` | Approval review, rejection reasons, escalation, snapshots |
| **Employee** | `employee@invoiceguard.ai` | `Employee@123` | Ingestion, OCR inspection, field corrections, re-extraction |

*Note: The platform includes a quick 1-click role switcher in the sidebar and login screen for instant evaluation.*

---

## Verification of the 10 Required Test Scenarios

The seeded database automatically configures realistic records validating all 10 test cases from Section 20:

1. **TEST 1: Valid Invoice (`INV-1001`)**:
   - Status: PASSED validation, LOW fraud risk (8.0), 98.5% confidence, PENDING manager sign-off.
2. **TEST 2: Duplicate Invoice (`INV-1002`)**:
   - Status: Flagged duplicate of INV-1001 with matching invoice number `ABC-2026-001`, validation FAILED, fraud risk HIGH, ESCALATED.
3. **TEST 3: Approved Invoice (`INV-1003`)**:
   - Status: Status APPROVED by Sarah Manager, timestamped and cryptographically logged.
4. **TEST 4: Suspicious High-Value Invoice (`INV-1004`)**:
   - Status: Total ₹850,000.00 exceeding standard limits, WARNING validation, HIGH fraud risk, requires manager override.
5. **TEST 5: Incorrect Tax Calculation**:
   - Test by modifying subtotal/tax in `/extraction`, validation triggers `AMOUNT_CHECK` failure.
6. **TEST 6: Poor-Quality Document & Independent Checker**:
   - Triggers `CHECKER PASSED? FAIL` and initiates re-extraction strategies up to 3 attempts.
7. **TEST 7: Manager Approval Action**:
   - Test via `/approvals`, updates status to APPROVED and seals new snapshot.
8. **TEST 8: Manager Rejection Action**:
   - Test via `/approvals`, requires mandatory written rejection reason.
9. **TEST 9: Daily n8n Scheduled Follow-Up**:
   - Live query available at `GET /api/n8n/follow-up-queue`.
10. **TEST 10: n8n Inbound Webhook Validation**:
    - Test via `POST /api/n8n/invoice-event`, validates payload and returns 422 if attributes are missing.

---

## Project Structure

```
invoiceguard-ai/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (auth, invoices, extraction, validation, fraud, approvals...)
│   │   ├── core/            # Config, settings, and JWT/BCrypt security
│   │   ├── database/        # Session engine and database seeder
│   │   ├── models/          # 13 SQLAlchemy relational models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # OCR, extraction, validation, fraud, checker, snapshots, audit, n8n
│   │   └── utils/
│   ├── main.py              # Application entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── contexts/        # AuthContext with quick role switching
│   │   ├── layouts/         # MainLayout with navy sidebar & top navigation
│   │   ├── pages/           # 11 complete pages (Dashboard, Upload, Extraction, Validation...)
│   │   ├── services/        # Axios API client
│   │   ├── types/           # TypeScript definitions
│   │   ├── App.tsx          # Application router
│   │   ├── index.css        # Tailwind v4 theme styling
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── n8n/
│   ├── workflows/           # invoiceguard_workflow.json (Importable 8-node n8n workflow)
│   └── README.md            # n8n setup guide
├── storage/
│   └── invoices/            # Stored PDFs and generated invoices
├── docs/
│   ├── API_DOCUMENTATION.md # OpenAPI specification details
│   ├── DATABASE_SCHEMA.md   # ER diagram and table definitions
│   ├── N8N_SETUP.md         # n8n configuration walkthrough
│   └── USER_GUIDE.md        # Step-by-step user workflows
├── .env.example
└── README.md
```
