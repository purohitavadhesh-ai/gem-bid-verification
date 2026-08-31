from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Verdict(Base):
    """
    Stores deterministic comparison verdict for each (Requirement x Bidder) pair.
    Maintains complete auditability and preserves human overrides.
    """
    __tablename__ = "verdicts"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False, index=True)
    
    # Verdict outcome: PASS, FAIL, MISSING, NEEDS HUMAN REVIEW
    status = Column(String(50), nullable=False, default="MISSING")
    
    # Evidence Citation (FR-10)
    evidence_doc_name = Column(String(255), nullable=True)
    evidence_page = Column(Integer, nullable=True)
    evidence_snippet = Column(Text, nullable=True)
    evidence_note = Column(String(255), nullable=True) # e.g., "Rs.2.4 Cr Verified", "Expired Dec 2025"
    confidence = Column(Float, default=1.0)
    
    # Human Override Fields (FR-14 / Data Integrity)
    is_overridden = Column(Boolean, default=False)
    override_status = Column(String(50), nullable=True) # Overridden PASS/FAIL/REVIEW
    override_comment = Column(Text, nullable=True)
    overridden_by = Column(String(100), nullable=True)
    overridden_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    requirement = relationship("Requirement", backref="verdicts")
    bidder = relationship("Bidder", backref="verdicts")
