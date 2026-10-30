import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.init_db import init_database

# Import routers
from app.api.auth import router as auth_router
from app.api.invoices import router as invoices_router
from app.api.extraction import router as extraction_router
from app.api.validation import router as validation_router
from app.api.fraud import router as fraud_router
from app.api.approvals import router as approvals_router
from app.api.suppliers import router as suppliers_router
from app.api.purchase_orders import router as po_router
from app.api.dashboard import router as dashboard_router
from app.api.reports import router as reports_router
from app.api.audit import router as audit_router
from app.api.snapshots import router as snapshots_router
from app.api.notifications import router as notifications_router
from app.api.n8n import router as n8n_router
from app.api.demo import router as demo_router

# Initialize database on app load
init_database()

app = FastAPI(
    title="InvoiceGuard AI Backend",
    description="Intelligent Invoice Processing, Business Validation, and Fraud Detection Platform API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for invoice files
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage/invoices", StaticFiles(directory=settings.STORAGE_DIR), name="invoice_storage")

# Include Routers under /api
api_prefix = settings.API_V1_STR

app.include_router(auth_router, prefix=api_prefix)
app.include_router(invoices_router, prefix=api_prefix)
app.include_router(extraction_router, prefix=api_prefix)
app.include_router(validation_router, prefix=api_prefix)
app.include_router(fraud_router, prefix=api_prefix)
app.include_router(approvals_router, prefix=api_prefix)
app.include_router(suppliers_router, prefix=api_prefix)
app.include_router(po_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(snapshots_router, prefix=api_prefix)
app.include_router(notifications_router, prefix=api_prefix)
app.include_router(n8n_router, prefix=api_prefix)
app.include_router(demo_router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "platform": "InvoiceGuard AI",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "engine": "FastAPI", "ocr_service": "PyMuPDF/OpenCV"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
