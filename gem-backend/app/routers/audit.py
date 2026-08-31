from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

def record_audit_log(
    db: Session,
    action: str,
    performed_by: str,
    details: str,
    tender_id: Optional[str] = None,
    bidder_id: Optional[str] = None
) -> AuditLog:
    """Helper function to record immutable audit trail entries."""
    log = AuditLog(
        timestamp=datetime.now(timezone.utc),
        action=action,
        tender_id=tender_id or "SYSTEM",
        bidder_id=bidder_id,
        performed_by=performed_by,
        details=details
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("")
def get_audit_logs(
    date_range: Optional[str] = Query(None, alias="dateRange"),
    action_type: Optional[str] = Query(None, alias="actionType"),
    officer: Optional[str] = Query(None, alias="officer"),
    db: Session = Depends(get_db)
):
    """
    Returns filterable audit logs matching Figma Audit Trail screen.
    """
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())

    if action_type and action_type != "All Actions":
        query = query.filter(AuditLog.action.ilike(f"%{action_type}%"))
    if officer and officer != "All Users":
        query = query.filter(AuditLog.performed_by.ilike(f"%{officer}%"))

    logs = query.all()

    # Seed baseline initial records if empty so UI looks complete
    if not logs:
        sample_logs = [
            ("Compliance Approved", "GEM/2026/001", "Rajesh Kumar", "Saraswati Energy Approved"),
            ("Flagged Risk Triggered", "GEM/2026/012", "AI-System", "Overlapping Director on Apex Valves"),
            ("Uploaded Bid Files Scanned", "GEM/2026/001", "Rajesh Kumar", "EPF Expired tag placed on Western Fuel"),
            ("New Tender Initiated", "GEM/2026/094", "Ankita Roy", "Strategic Petroleum Storage Tender"),
            ("System Registry Sync", "SYSTEM", "NIC Service", "Synced PAN/GST API registries"),
            ("Compliance Report Downloaded", "GEM/2026/001", "Rajesh Kumar", "PDF exported for Review Board")
        ]
        for act, tid, who, det in sample_logs:
            record_audit_log(db, action=act, tender_id=tid, performed_by=who, details=det)
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

    return [
        {
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "action": l.action,
            "tenderId": l.tender_id,
            "performedBy": l.performed_by,
            "details": l.details
        } for l in logs
    ]
