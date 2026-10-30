import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import InvoiceSnapshot, Invoice, User
from app.schemas.schemas import InvoiceSnapshotResponse
from app.core.permissions import get_current_active_user, check_invoice_access
from app.services.snapshot_service import snapshot_service

router = APIRouter(prefix="/invoices", tags=["Snapshots"])

@router.get("/{invoice_id}/snapshot")
def get_snapshot(
    invoice_id: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "view_snapshot")

    query = db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == invoice_id)
    if version:
        snapshot = query.filter(InvoiceSnapshot.version == version).first()
    else:
        snapshot = query.order_by(desc(InvoiceSnapshot.version)).first()

    if not snapshot:
        snapshot = snapshot_service.create_snapshot(invoice_id, db)

    # Also list all available versions
    all_versions = db.query(InvoiceSnapshot.version, InvoiceSnapshot.created_at, InvoiceSnapshot.snapshot_hash).filter(
        InvoiceSnapshot.invoice_id == invoice_id
    ).order_by(InvoiceSnapshot.version.asc()).all()

    return {
        "current_snapshot": snapshot,
        "available_versions": [{"version": v[0], "created_at": v[1], "hash": v[2]} for v in all_versions]
    }

@router.get("/{invoice_id}/snapshot/download")
def download_snapshot(
    invoice_id: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    check_invoice_access(invoice, current_user, "download_snapshot")
    query = db.query(InvoiceSnapshot).filter(InvoiceSnapshot.invoice_id == invoice_id)
    if version:
        snapshot = query.filter(InvoiceSnapshot.version == version).first()
    else:
        snapshot = query.order_by(desc(InvoiceSnapshot.version)).first()

    if not snapshot:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        snapshot = snapshot_service.create_snapshot(invoice_id, db)

    json_str = json.dumps(snapshot.snapshot_json, indent=2)
    filename = f"{invoice_id}_snapshot_v{snapshot.version}.json"

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
