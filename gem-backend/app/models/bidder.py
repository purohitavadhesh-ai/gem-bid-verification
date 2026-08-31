from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Bidder(Base):
    """Represents a Bidder participating in a Tender."""
    __tablename__ = "bidders"

    id = Column(Integer, primary_key=True, index=True)
    display_id = Column(String(50), index=True, nullable=True)  # e.g., "bid-1", "bid-2"
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    name = Column(String(255), nullable=False)
    gem_bid_ref = Column(String(100), nullable=True)  # e.g., "GEM-BID-9923212"
    bid_value = Column(String(100), nullable=True)    # e.g., "Rs. 1,42,50,000"
    subtitle = Column(String(255), nullable=True)     # e.g., "OEM Authorized Petroleum Distributor"
    score = Column(Integer, default=0)                # 0 to 100
    risk_level = Column(String(50), default="Pending") # "Compliant", "Moderate", "Non-Compliant"
    status = Column(String(50), default="Pending")     # Matches UI status
    submitted_ago = Column(String(50), default="Just now")
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    tender = relationship("Tender", back_populates="bidders")
    documents = relationship("BidderDocument", back_populates="bidder", cascade="all, delete-orphan")


class BidderDocument(Base):
    """Represents an uploaded PDF document for a Bidder."""
    __tablename__ = "bidder_documents"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    status = Column(String(50), default="PENDING")  # "PENDING", "EXTRACTED", "EXTRACTION_FAILED"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    bidder = relationship("Bidder", back_populates="documents")
