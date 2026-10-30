# InvoiceGuard AI - API Documentation

Interactive OpenAPI / Swagger UI is accessible at `http://127.0.0.1:8000/docs`.

## 1. Authentication
- `POST /api/auth/register`: Register new user (`admin`, `manager`, `employee`).
- `POST /api/auth/login`: Authenticate and receive JWT bearer token.
- `GET /api/auth/me`: Retrieve current user profile.

## 2. Invoice Management
- `POST /api/invoices/upload`: Upload invoice (PDF, JPG, PNG). Triggers straight-through pipeline:
  1. OCR text & bounding coordinates extraction
  2. AI structured field mapping & confidence scoring
  3. 8-rule Business Validation
  4. Independent Fraud Risk Engine
  5. Cryptographic SHA-256 JSON snapshot
  6. Append-only chained audit log
  7. n8n webhook event dispatch
- `GET /api/invoices`: List all invoices with search, date, status, and vendor filters.
- `GET /api/invoices/{id}`: Detailed invoice information with items and extraction results.
- `DELETE /api/invoices/{id}`: Soft/Hard delete invoice file and records.

## 3. Extraction & Independent Checker
- `GET /api/invoices/{id}/extraction`: Retrieve latest extraction with field confidence scores.
- `PUT /api/invoices/{id}/extraction`: Manually correct extracted fields and re-validate.
- `POST /api/invoices/{id}/re-extract`: Execute re-extraction cycle (max 3 attempts).
- `GET /api/invoices/{id}/checker`: Query independent checker verification status.

## 4. Business Validation
- `GET /api/invoices/{id}/validation`: Retrieve 8-rule validation results with expected vs actual values.
- `POST /api/invoices/{id}/validate`: Trigger fresh validation run against master database.

## 5. Fraud Detection
- `GET /api/invoices/{id}/fraud-analysis`: Retrieve fraud risk score (0-100), category (LOW/MEDIUM/HIGH), detected anomalies, and explainable AI narrative.
- `POST /api/invoices/{id}/fraud-check`: Re-run multivariate fraud analysis.

## 6. Approvals
- `GET /api/approvals/pending`: Retrieve pending manager reviews.
- `POST /api/invoices/{id}/approve`: Manager approval (high-risk invoices require override justification).
- `POST /api/invoices/{id}/reject`: Manager rejection with mandatory reason.
- `POST /api/invoices/{id}/escalate`: Escalate invoice for forensic and compliance audit.

## 7. Master Data & Reports
- `GET /api/suppliers`, `POST /api/suppliers`: Supplier master CRUD.
- `GET /api/purchase-orders`, `POST /api/purchase-orders`: Purchase Order CRUD.
- `GET /api/reports/invoices`: Filtered reports dataset.
- `GET /api/reports/export/csv`: Export compliance CSV.
- `GET /api/reports/export/pdf`: Generate landscape A4 PDF report with PyMuPDF.

## 8. Audit Logs & Snapshots
- `GET /api/audit-logs`: Chained audit trail with SHA-256 record hashes.
- `GET /api/invoices/{id}/snapshot`: Formatted JSON snapshot preview and version list.
- `GET /api/invoices/{id}/snapshot/download`: Download versioned JSON snapshot.

## 9. n8n Automation
- `POST /api/n8n/invoice-event`: Inbound webhook endpoint matching Node 1 & Node 2.
- `POST /api/n8n/notification-result`: Records workflow execution output.
- `GET /api/n8n/follow-up-queue`: Serves daily scheduled follow-up reminders.
- `POST /api/n8n/simulate-pipeline/{id}`: Runs interactive diagnostic simulation of the 8-node workflow.
