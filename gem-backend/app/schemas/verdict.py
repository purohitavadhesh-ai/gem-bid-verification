from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class VerdictItem(BaseModel):
    requirement_id: int
    label: str
    category: str # "mandatory" | "financial_technical"
    status: str # "PASS" | "FAIL" | "MISSING" | "NEEDS HUMAN REVIEW"
    note: Optional[str] = None
    evidence_doc_name: Optional[str] = None
    evidence_page: Optional[int] = None
    evidence_snippet: Optional[str] = None
    confidence: float = 1.0
    is_overridden: bool = False
    override_status: Optional[str] = None
    override_comment: Optional[str] = None

class VerdictOverrideRequest(BaseModel):
    override_status: str # "PASS" | "FAIL" | "NEEDS HUMAN REVIEW"
    override_comment: str
    overridden_by: str = "Rajesh Kumar"

class ContradictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bidder_id: int
    fact_key: str
    description: str
    value_a: str
    source_doc_a: str
    source_page_a: int
    value_b: str
    source_doc_b: str
    source_page_b: int
    severity: str
    created_at: datetime

class ChecklistItemResponse(BaseModel):
    label: str
    status: str # "PASS" | "FAIL" | "MISSING" | "NEEDS HUMAN REVIEW"
    note: Optional[str] = None
    evidence_doc_name: Optional[str] = None
    evidence_page: Optional[int] = None
    evidence_snippet: Optional[str] = None
    is_overridden: bool = False

class BidderResultsResponse(BaseModel):
    """Exact data shape required by the React BidderAnalysis UI screen."""
    id: str # display_id or str(id), e.g. "bid-2"
    name: str
    score: int
    riskLevel: str
    subtitle: Optional[str] = None
    gemBidRef: Optional[str] = None
    bidValue: Optional[str] = None
    aiSummary: str
    mandatoryDocuments: List[ChecklistItemResponse]
    financialTechnical: List[ChecklistItemResponse]
    contradictions: List[ContradictionResponse] = []
