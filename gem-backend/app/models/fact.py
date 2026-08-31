from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class BidderFact(Base):
    """
    Represents an AI-extracted structured fact from a Bidder's submitted documents.
    Linked to source document, page number, and quote for explainability.
    """
    __tablename__ = "bidder_facts"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False, index=True)
    
    # Fact categorization and identification
    category = Column(String(50), nullable=False, default="mandatory") # "mandatory" | "financial_technical"
    fact_key = Column(String(100), index=True, nullable=False) # e.g. "turnover", "pan", "gstin", "iso_9001", "oem_auth"
    label = Column(String(255), nullable=False) # Human-readable label
    
    # Extracted values
    extracted_value = Column(String(255), nullable=False) # e.g. "Rs. 2.4 Cr", "Active", "Expired Dec 2025"
    numeric_value = Column(Float, nullable=True) # e.g. 2.4 (in Crores)
    date_value = Column(String(50), nullable=True) # e.g. "2025-12-31"
    confidence = Column(Float, default=1.0)
    
    # Traceability & Evidence Source
    source_document_id = Column(Integer, ForeignKey("bidder_documents.id"), nullable=True)
    source_document_name = Column(String(255), nullable=True)
    source_page = Column(Integer, nullable=False, default=1)
    raw_snippet = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    bidder = relationship("Bidder", backref="facts")
