from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Contradiction(Base):
    """
    Stores detected contradictions between multiple documents/pages submitted by the same bidder (FR-11).
    """
    __tablename__ = "contradictions"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False, index=True)
    
    fact_key = Column(String(100), nullable=False) # e.g. "turnover", "incorporation_date"
    description = Column(Text, nullable=False)
    
    # First source citation
    value_a = Column(String(255), nullable=False)
    source_doc_a = Column(String(255), nullable=False)
    source_page_a = Column(Integer, nullable=False)
    
    # Conflicting second source citation
    value_b = Column(String(255), nullable=False)
    source_doc_b = Column(String(255), nullable=False)
    source_page_b = Column(Integer, nullable=False)
    
    severity = Column(String(50), default="Moderate Risk") # "Critical Risk", "Moderate Risk", "Low Risk"
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    bidder = relationship("Bidder", backref="contradictions")
