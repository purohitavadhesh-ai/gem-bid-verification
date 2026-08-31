from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class BidderCreate(BaseModel):
    name: str
    gem_bid_ref: Optional[str] = None
    bid_value: Optional[str] = None
    subtitle: Optional[str] = None

class BidderDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bidder_id: int
    filename: str
    file_size: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

class BidderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_id: Optional[str] = None
    tender_id: int
    name: str
    gem_bid_ref: Optional[str] = None
    bid_value: Optional[str] = None
    subtitle: Optional[str] = None
    score: int
    risk_level: str
    status: str
    submitted_ago: str
    created_at: datetime
    documents: List[BidderDocumentResponse] = []
