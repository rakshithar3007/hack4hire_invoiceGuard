from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import PurchaseOrder, Supplier
from app.schemas.schemas import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse
from app.core.security import require_roles
from app.services.audit_service import audit_service

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

@router.get("", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.po_number).all()
    results = []
    for po in pos:
        results.append(PurchaseOrderResponse(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            expected_amount=po.expected_amount,
            status=po.status,
            created_at=po.created_at,
            supplier_name=po.supplier.supplier_name if po.supplier else "N/A"
        ))
    return results

@router.post("", response_model=PurchaseOrderResponse)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "manager"]))
):
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number.ilike(po_in.po_number.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="PO number already exists.")

    sup = db.query(Supplier).filter(Supplier.id == po_in.supplier_id).first()
    if not sup:
        raise HTTPException(status_code=400, detail="Referenced Supplier ID does not exist.")

    new_po = PurchaseOrder(
        po_number=po_in.po_number.strip().upper(),
        supplier_id=po_in.supplier_id,
        expected_amount=po_in.expected_amount,
        status=po_in.status or "OPEN"
    )
    db.add(new_po)
    db.commit()
    db.refresh(new_po)

    audit_service.log_event(
        db,
        action="PURCHASE_ORDER_CREATED",
        user_id=current_user.id,
        details={"po_number": new_po.po_number, "expected_amount": new_po.expected_amount}
    )

    return PurchaseOrderResponse(
        id=new_po.id,
        po_number=new_po.po_number,
        supplier_id=new_po.supplier_id,
        expected_amount=new_po.expected_amount,
        status=new_po.status,
        created_at=new_po.created_at,
        supplier_name=sup.supplier_name
    )

@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    po_up: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "manager"]))
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    if po_up.supplier_id is not None:
        po.supplier_id = po_up.supplier_id
    if po_up.expected_amount is not None:
        po.expected_amount = po_up.expected_amount
    if po_up.status is not None:
        po.status = po_up.status

    db.commit()
    db.refresh(po)
    return PurchaseOrderResponse(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        expected_amount=po.expected_amount,
        status=po.status,
        created_at=po.created_at,
        supplier_name=po.supplier.supplier_name if po.supplier else "N/A"
    )
