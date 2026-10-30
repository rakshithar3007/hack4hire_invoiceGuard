# InvoiceGuard AI - n8n Automation Engine Setup

This guide details how to import, configure, and orchestrate the 8-node n8n workflow designed for InvoiceGuard AI.

## Architecture Mapping

```
FastAPI Event
     │
     ▼
[Node 1: Webhook - New Invoice] (POST http://localhost:5678/webhook/new-invoice)
     │
     ▼
[Node 2: Validate Invoice Data] (Checks ID, vendor, total amount, validation status, fraud risk)
     │
     ▼
[Node 3: Is Data Valid?]
     ├─── True ───► [Node 4: AI Analysis & Storage] ───► [Node 5: Notifications & Response]
     │
     └─── False ──► [Node 6: Respond - Validation Error]

[Node 7: Schedule - Daily Follow Up] (Cron: 0 9 * * *) ───► [Node 8: Follow-up Processing]
```

## Step-by-Step Installation

### 1. Launching n8n
If you have n8n installed globally or via npm:
```bash
npx n8n
```
Or via Docker:
```bash
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

### 2. Importing the Workflow
1. Navigate to `http://localhost:5678`.
2. Open the main navigation menu and click **Workflows** -> **Import from File...**.
3. Select `n8n/workflows/invoiceguard_workflow.json`.
4. The canvas will render all 8 nodes connected.

### 3. Setting Up Credentials & Webhooks
1. Open **Node 1: Webhook - New Invoice**:
   - HTTP Method: `POST`
   - Path: `new-invoice`
   - Response Mode: `Using 'Respond to Webhook' Node`
2. Open **Node 4: AI Analysis & Storage**:
   - URL: `http://127.0.0.1:8000/api/n8n/notification-result`
3. Open **Node 8: Follow-up Processing**:
   - URL: `http://127.0.0.1:8000/api/n8n/follow-up-queue`
4. Toggle the workflow **Active** switch at the top right.

### 4. Interactive Simulation & Testing
You can test the entire pipeline directly without running external webhooks:
1. Open the InvoiceGuard AI frontend at `http://127.0.0.1:5173/settings`.
2. Select an invoice from the dropdown.
3. Click **Run Pipeline**.
4. The system will execute all 8 nodes and return a live diagnostic trace.
