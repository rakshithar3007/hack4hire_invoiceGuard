import hashlib
import json
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import AuditLog

class AuditService:
    @staticmethod
    def _generate_record_hash(prev_hash: str, invoice_id: str, action: str, timestamp_str: str, details_str: str) -> str:
        payload = f"{prev_hash}|{invoice_id}|{action}|{timestamp_str}|{details_str}"
        return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def log_event(
        cls,
        db: Session,
        action: str,
        invoice_id: Optional[str] = None,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Appends an immutable audit log entry chained cryptographically
        to ensure tamper resistance.
        """
        # Fetch latest audit record to chain hash
        last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        prev_hash = last_log.record_hash if (last_log and last_log.record_hash) else "0x0000000000000000"

        now = datetime.datetime.utcnow()
        now_str = now.isoformat()
        details_str = json.dumps(details or {}, sort_keys=True)
        record_hash = cls._generate_record_hash(prev_hash, invoice_id or "SYSTEM", action, now_str, details_str)

        log_entry = AuditLog(
            invoice_id=invoice_id,
            user_id=user_id,
            action=action,
            details=details or {},
            record_hash=record_hash,
            timestamp=now
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

audit_service = AuditService()
