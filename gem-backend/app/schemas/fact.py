from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class BidderFactItem(BaseModel):
    category: str = "mandatory" # "mandatory" | "financial_technical"
    fact_key: str
    label: str
    extracted_value: str
    numeric_value: Optional[float] = None
    date_value: Optional[str] = None
    confidence: float = 1.0
    source_document_name: Optional[str] = None
    source_page: int = 1
    raw_snippet: Optional[str] = None

class BidderFactResponse(BidderFactItem):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bidder_id: int
    source_document_id: Optional[int] = None
    created_at: datetime

class BidderFactsSummary(BaseModel):
    bidder_id: int
    total_facts: int
    facts: List[BidderFactResponse]
