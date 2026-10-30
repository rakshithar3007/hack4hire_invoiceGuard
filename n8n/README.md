# InvoiceGuard AI - n8n Automation Engine

This directory contains the production-grade automation workflow adapted directly from the 8-node n8n workflow architecture:

```
[Node 1: Webhook - New Invoice]
              │
              ▼
[Node 2: Validate Invoice Data]
              │
              ▼
    [Node 3: Is Data Valid?]
           ├─── True ───► [Node 4: AI Analysis & Storage] ───► [Node 5: Notifications & Response]
           │
           └─── False ──► [Node 6: Respond - Validation Error]

[Node 7: Schedule - Daily Follow Up] ───► [Node 8: Follow-up Processing]
```

## Node Specifications

### Node 1: Webhook - New Invoice
- **Trigger**: Receives events from FastAPI backend when an invoice is processed or status changes.
- **Method**: `POST`
- **Path**: `new-invoice`
- **Headers**: `X-Webhook-Secret: <your_secret>`

### Node 2: Validate Invoice Data
- **Type**: Code Node (JavaScript)
- **Operation**: Verifies required invoice attributes:
  - `invoice_id`
  - `supplier_name`
  - `total_amount`
  - `validation_status`
  - `fraud_risk`

### Node 3: Is Data Valid?
- **Type**: IF Condition Node
- **Condition**: `$json.is_valid === true`
- **True**: Continues to AI Analysis & Storage.
- **False**: Redirects to Validation Error Response.

### Node 4: AI Analysis & Storage
- **Type**: HTTP Request Node
- **Target**: `POST http://127.0.0.1:8000/api/n8n/notification-result`
- **Payload**: Formats AI explanation and risk assessment summary.

### Node 5: Notifications & Response
- **Type**: Respond to Webhook / Gmail Integration
- **Output**: Returns JSON confirmation and triggers manager dispatch.

### Node 6: Respond - Validation Error
- **Type**: Respond to Webhook Node
- **HTTP Status**: `422 Unprocessable Entity`
- **Output**: Returns validation failure details to caller.

### Node 7: Schedule - Daily Follow Up
- **Type**: Schedule Trigger
- **Cron**: `0 9 * * *` (Runs every morning at 09:00 AM)

### Node 8: Follow-up Processing
- **Type**: HTTP Request
- **Target**: `GET http://127.0.0.1:8000/api/n8n/follow-up-queue`
- **Operation**: Finds unreviewed/pending manager approvals and sends escalation digests.

## How to Import in n8n

1. Start your local n8n instance (e.g., `npx n8n` or Docker).
2. Open n8n interface (`http://localhost:5678`).
3. Click **Workflows** -> **Import from File...**
4. Select `workflows/invoiceguard_workflow.json`.
5. Toggle **Active** to enabled.
