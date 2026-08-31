from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ExtractedPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doc_type: str
    doc_id: int
    page_number: int
    raw_text: str
    method: str  # "native" or "ocr"
    character_count: int
    created_at: datetime

class DocumentPagesSummary(BaseModel):
    doc_type: str
    doc_id: int
    filename: str
    status: str
    error_message: Optional[str] = None
    total_pages: int
    pages: List[ExtractedPageResponse]
