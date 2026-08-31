from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class AuditLog(Base):
    """
    Immutable regulatory compliance and bid action audit log (FR-17).
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    action = Column(String(100), nullable=False, index=True) # e.g. "Compliance Approved", "Uploaded Bid Files Scanned"
    tender_id = Column(String(50), nullable=True) # e.g. "GEM/2026/001" or "SYSTEM"
    bidder_id = Column(String(50), nullable=True)
    performed_by = Column(String(100), nullable=False) # e.g. "Rajesh Kumar", "AI-System", "NIC Service"
    details = Column(Text, nullable=False)
