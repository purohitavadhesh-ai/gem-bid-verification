from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class TenderCreate(BaseModel):
    display_id: str  # e.g., "GEM/2026/001"
    title: str
    description: Optional[str] = None

class TenderDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    filename: str
    file_size: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

class TenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_id: str
    title: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    documents: List[TenderDocumentResponse] = []
    bidders_count: Optional[int] = 0
