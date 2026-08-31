from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Tender(Base):
    """Represents a GeM Procurement Tender."""
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    display_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "GEM/2026/001"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Pending")  # "Pending", "In Progress", "Verified"
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    documents = relationship("TenderDocument", back_populates="tender", cascade="all, delete-orphan")
    bidders = relationship("Bidder", back_populates="tender", cascade="all, delete-orphan")


class TenderDocument(Base):
    """Represents an uploaded PDF document for a Tender."""
    __tablename__ = "tender_documents"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    status = Column(String(50), default="PENDING")  # "PENDING", "EXTRACTED", "EXTRACTION_FAILED"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    tender = relationship("Tender", back_populates="documents")
