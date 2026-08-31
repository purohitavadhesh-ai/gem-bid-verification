from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Requirement(Base):
    """
    Represents an AI-extracted structured requirement from a Tender document.
    Categorized into 'mandatory' or 'financial_technical' to align with UI checklist.
    """
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, index=True)
    
    # Requirement metadata
    label = Column(String(255), nullable=False) # e.g. "Annual Avg Turnover (> Rs.1 Cr)", "PAN Verification"
    category = Column(String(50), nullable=False, default="mandatory") # "mandatory" | "financial_technical"
    is_mandatory = Column(Boolean, default=True)
    
    # Rule engine matching fields
    requirement_type = Column(String(50), default="exact_match") # "numeric", "exact_match", "date", "text"
    target_value = Column(String(255), nullable=True) # e.g. "1.0", "ISO 9001", "Active"
    comparison_operator = Column(String(20), default="==") # ">=", "==", "<=", "not_expired"
    
    # Traceability & Evidence Source
    source_document_id = Column(Integer, ForeignKey("tender_documents.id"), nullable=True)
    source_page = Column(Integer, nullable=False, default=1) # 1-indexed page
    raw_snippet = Column(Text, nullable=True) # Original text segment extracted from
    
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    tender = relationship("Tender", backref="requirements")
