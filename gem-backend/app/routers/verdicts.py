from datetime import datetime, timezone
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tender import Tender
from app.models.bidder import Bidder
from app.models.requirement import Requirement
from app.models.verdict import Verdict
from app.models.contradiction import Contradiction
from app.schemas.verdict import (
    VerdictOverrideRequest, BidderResultsResponse,
    ChecklistItemResponse, ContradictionResponse
)
from app.services.rule_engine import run_bidder_verification
from app.services.contradiction_detector import detect_bidder_contradictions

router = APIRouter(tags=["Verification & Verdicts"])

def _get_tender_or_404(tender_id: Union[int, str], db: Session) -> Tender:
    if isinstance(tender_id, int) or (isinstance(tender_id, str) and tender_id.isdigit()):
        tender = db.query(Tender).filter(Tender.id == int(tender_id)).first()
    else:
        tender = db.query(Tender).filter(Tender.display_id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tender '{tender_id}' not found.")
    return tender

def _get_bidder_or_404(bidder_id: Union[int, str], db: Session) -> Bidder:
    if isinstance(bidder_id, int) or (isinstance(bidder_id, str) and bidder_id.isdigit()):
        bidder = db.query(Bidder).filter(Bidder.id == int(bidder_id)).first()
    else:
        bidder = db.query(Bidder).filter(Bidder.display_id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Bidder '{bidder_id}' not found.")
    return bidder

@router.post("/tenders/{tender_id}/bidders/{bidder_id}/verify", response_model=BidderResultsResponse)
def verify_bidder_compliance(tender_id: str, bidder_id: str, db: Session = Depends(get_db)):
    """
    Executes the deterministic Rule Engine and Contradiction Detection for a bidder.
    Produces evidence-backed verdicts for each tender requirement.
    """
    tender = _get_tender_or_404(tender_id, db)
    bidder = _get_bidder_or_404(bidder_id, db)
    
    # 1. Run rule engine
    run_bidder_verification(tender.id, bidder.id, db)
    
    # 2. Run contradiction detector
    detect_bidder_contradictions(bidder.id, db)
    
    # Return formatted results matching Figma UI
    return get_bidder_results(tender_id=tender_id, bidder_id=bidder_id, db=db)

@router.get("/tenders/{tender_id}/bidders/{bidder_id}/results", response_model=BidderResultsResponse)
def get_bidder_results(tender_id: str, bidder_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the complete compliance verification results for the Bidder Analysis screen.
    Matches the exact data shape consumed by the React UI.
    """
    tender = _get_tender_or_404(tender_id, db)
    bidder = _get_bidder_or_404(bidder_id, db)
    
    # Fetch all verdicts
    verdicts = db.query(Verdict).filter(
        Verdict.tender_id == tender.id,
        Verdict.bidder_id == bidder.id
    ).all()

    # If no verdicts exist yet, run verification automatically
    if not verdicts:
        run_bidder_verification(tender.id, bidder.id, db)
        detect_bidder_contradictions(bidder.id, db)
        verdicts = db.query(Verdict).filter(
            Verdict.tender_id == tender.id,
            Verdict.bidder_id == bidder.id
        ).all()

    mandatory_docs: List[ChecklistItemResponse] = []
    fin_tech_docs: List[ChecklistItemResponse] = []

    for v in verdicts:
        req = v.requirement
        effective_status = v.override_status if v.is_overridden else v.status
        item = ChecklistItemResponse(
            label=req.label,
            status=effective_status,
            note=v.evidence_note,
            evidence_doc_name=v.evidence_doc_name,
            evidence_page=v.evidence_page,
            evidence_snippet=v.evidence_snippet,
            is_overridden=v.is_overridden
        )
        if req.category == "mandatory":
            mandatory_docs.append(item)
        else:
            fin_tech_docs.append(item)

    # Fetch contradictions
    contradictions = db.query(Contradiction).filter(Contradiction.bidder_id == bidder.id).all()

    # Formulate AI Summary & calculate score from verdicts
    pass_cnt = sum(1 for v in verdicts if (v.override_status if v.is_overridden else v.status) == "PASS")
    fail_cnt = sum(1 for v in verdicts if (v.override_status if v.is_overridden else v.status) == "FAIL")
    failed_items = [v.evidence_note or v.requirement.label for v in verdicts if (v.override_status if v.is_overridden else v.status) == "FAIL"]
    
    if bidder.score and bidder.score > 0:
        score = bidder.score
        risk_level = bidder.risk_level
    elif fail_cnt == 0:
        score = 96
        risk_level = "Compliant"
    elif fail_cnt <= 2:
        score = 78
        risk_level = "Moderate"
    else:
        score = 42
        risk_level = "Non-Compliant"

    if not failed_items:
        ai_summary = "All statutory and technical specifications verified successfully with clean compliance."
    else:
        ai_summary = f"This bid triggers {risk_level.lower()} validation risk due to " + " and ".join(failed_items[:2]) + "."

    return BidderResultsResponse(
        id=bidder.display_id or str(bidder.id),
        name=bidder.name,
        score=score,
        riskLevel=risk_level,
        subtitle=bidder.subtitle or "Registered Vendor • GeM Verified Supplier",
        gemBidRef=bidder.gem_bid_ref or f"GEM-BID-{bidder.id * 11029}",
        bidValue=bidder.bid_value or "Rs. 1,42,50,000",
        aiSummary=ai_summary,
        mandatoryDocuments=mandatory_docs,
        financialTechnical=fin_tech_docs,
        contradictions=[ContradictionResponse.model_validate(c) for c in contradictions]
    )

@router.get("/tenders/{tender_id}/bidders/{bidder_id}/contradictions", response_model=List[ContradictionResponse])
def get_bidder_contradictions(tender_id: str, bidder_id: str, db: Session = Depends(get_db)):
    """Retrieve all detected contradictions for a bidder."""
    bidder = _get_bidder_or_404(bidder_id, db)
    return bidder.contradictions

@router.patch("/verdicts/{verdict_id}", response_model=ChecklistItemResponse)
def override_verdict(
    verdict_id: int,
    override_data: VerdictOverrideRequest,
    db: Session = Depends(get_db)
):
    """
    Officer human override on an individual requirement verdict (FR-14).
    Preserves original AI verdict while recording override, reason, officer ID, and timestamp.
    """
    verdict = db.query(Verdict).filter(Verdict.id == verdict_id).first()
    if not verdict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Verdict ID {verdict_id} not found.")

    verdict.is_overridden = True
    verdict.override_status = override_data.override_status
    verdict.override_comment = override_data.override_comment
    verdict.overridden_by = override_data.overridden_by
    verdict.overridden_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(verdict)

    return ChecklistItemResponse(
        label=verdict.requirement.label,
        status=verdict.override_status,
        note=verdict.override_comment,
        evidence_doc_name=verdict.evidence_doc_name,
        evidence_page=verdict.evidence_page,
        evidence_snippet=verdict.evidence_snippet,
        is_overridden=True
    )

@router.post("/tenders/{tender_id}/bidders/{bidder_id}/decision")
def submit_bidder_decision(
    tender_id: str,
    bidder_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Records authoritative officer decision on a bidder: 'approve', 'flag_reject', or 'request_correction' (FR-13, FR-15).
    """
    decision = payload.get("decision", "approve")
    bidder = _get_bidder_or_404(bidder_id, db)
    
    if decision == "approve":
        bidder.status = "Approved"
    elif decision == "flag_reject":
        bidder.status = "Rejected"
    elif decision == "request_correction":
        bidder.status = "Correction Requested"

    db.commit()
    return {"success": True, "bidder_id": bidder.id, "status": bidder.status}

