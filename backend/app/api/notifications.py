from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Notification, User
from app.schemas.schemas import NotificationResponse
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Notification).order_by(desc(Notification.created_at))
    if unread_only:
        query = query.filter(Notification.read_status == False)
    return query.limit(limit).all()

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read_status = True
    db.commit()
    return {"message": "Notification marked as read", "id": notification_id}

@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.read_status == False).update({"read_status": True})
    db.commit()
    return {"message": "All notifications marked as read."}
