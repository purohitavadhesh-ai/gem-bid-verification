from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class ExtractedPage(Base):
    """Represents raw text extracted from a single page of a document."""
    __tablename__ = "extracted_pages"

    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(20), index=True, nullable=False)  # "tender" or "bidder"
    doc_id = Column(Integer, index=True, nullable=False)        # FK to tender_documents.id or bidder_documents.id
    page_number = Column(Integer, nullable=False)               # 1-indexed page number
    raw_text = Column(Text, nullable=False, default="")         # Extracted textual content
    method = Column(String(20), nullable=False, default="native") # "native" or "ocr"
    character_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
