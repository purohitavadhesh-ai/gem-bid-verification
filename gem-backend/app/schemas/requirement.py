from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class RequirementItem(BaseModel):
    label: str
    category: str = "mandatory" # "mandatory" | "financial_technical"
    is_mandatory: bool = True
    requirement_type: str = "exact_match" # "numeric", "exact_match", "date", "text"
    target_value: Optional[str] = None
    comparison_operator: Optional[str] = "=="
    source_page: int = 1
    raw_snippet: Optional[str] = None

class RequirementResponse(RequirementItem):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    source_document_id: Optional[int] = None
    created_at: datetime

class TenderRequirementsSummary(BaseModel):
    tender_id: int
    total_requirements: int
    mandatory_count: int
    financial_technical_count: int
    requirements: List[RequirementResponse]
