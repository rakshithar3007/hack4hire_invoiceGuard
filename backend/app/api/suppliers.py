from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Supplier
from app.schemas.schemas import SupplierCreate, SupplierUpdate, SupplierResponse
from app.core.security import require_roles
from app.services.audit_service import audit_service

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Supplier)
    if search:
        s = f"%{search}%"
        query = query.filter(Supplier.supplier_name.ilike(s) | Supplier.gstin.ilike(s))
    return query.order_by(Supplier.supplier_name).all()

@router.post("", response_model=SupplierResponse)
def create_supplier(
    sup_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "manager"]))
):
    existing = db.query(Supplier).filter(Supplier.gstin.ilike(sup_in.gstin.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier with this GSTIN already exists.")

    new_sup = Supplier(
        supplier_name=sup_in.supplier_name.strip(),
        gstin=sup_in.gstin.strip().upper(),
        address=sup_in.address,
        contact_details=sup_in.contact_details
    )
    db.add(new_sup)
    db.commit()
    db.refresh(new_sup)

    audit_service.log_event(
        db,
        action="SUPPLIER_CREATED",
        user_id=current_user.id,
        details={"supplier_id": new_sup.id, "name": new_sup.supplier_name, "gstin": new_sup.gstin}
    )
    return new_sup

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    sup_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "manager"]))
):
    sup = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if sup_update.supplier_name: sup.supplier_name = sup_update.supplier_name
    if sup_update.gstin: sup.gstin = sup_update.gstin.upper()
    if sup_update.address is not None: sup.address = sup_update.address
    if sup_update.contact_details is not None: sup.contact_details = sup_update.contact_details

    db.commit()
    db.refresh(sup)
    return sup

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin"]))
):
    sup = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(sup)
    db.commit()
    return {"message": f"Supplier #{supplier_id} deleted successfully."}
