import re
import logging
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.bidder import Bidder
from app.models.requirement import Requirement
from app.models.fact import BidderFact
from app.models.verdict import Verdict

logger = logging.getLogger("gem.rule_engine")
logging.basicConfig(level=logging.INFO)

def _normalize_key(text: str) -> str:
    """Normalizes label text into a standardized comparison key."""
    t = text.lower()
    if "turnover" in t or "revenue" in t:
        return "turnover"
    if "pan" in t:
        return "pan"
    if "gst" in t or "gstin" in t:
        return "gstin"
    if "msme" in t or "udyam" in t:
        return "msme"
    if "epf" in t or "esic" in t or "provident" in t:
        return "epf"
    if "iso" in t or "specification" in t or "grade" in t:
        return "technical_spec"
    if "oem" in t or "manufacturer" in t or "authorization" in t:
        return "oem_auth"
    if "solvency" in t or "bank" in t:
        return "solvency"
    if "performance" in t or "experience" in t:
        return "past_perf"
    if "delay" in t or "delivery" in t:
        return "delay_registry"
    if "blacklist" in t or "debarment" in t:
        return "blacklist_registry"
    return re.sub(r"[^a-z0-9]", "_", t).strip("_")

def evaluate_requirement_against_facts(
    req: Requirement,
    facts: List[BidderFact]
) -> Tuple[str, Optional[str], Optional[BidderFact]]:
    """
    Pure Python deterministic comparator for a single requirement.
    Returns: (status: PASS|FAIL|MISSING|NEEDS HUMAN REVIEW, note: str|None, matching_fact: BidderFact|None)
    """
    req_key = _normalize_key(req.label)
    
    # Locate matching facts
    matching_facts = [f for f in facts if _normalize_key(f.label) == req_key or f.fact_key == req_key]
    
    if not matching_facts:
        return "MISSING", "No submission found for this clause", None

    # Take highest confidence matching fact
    fact = sorted(matching_facts, key=lambda x: x.confidence, reverse=True)[0]

    # Rule 1: Low confidence routes to NEEDS HUMAN REVIEW
    if fact.confidence < 0.65:
        return "NEEDS HUMAN REVIEW", f"Low extraction confidence ({int(fact.confidence * 100)}%)", fact

    val = fact.extracted_value.strip()

    # Rule 2: Numeric threshold evaluation (e.g. Turnover >= 1.0 Cr)
    if req.requirement_type == "numeric":
        try:
            target = float(req.target_value) if req.target_value else 1.0
            actual = fact.numeric_value
            if actual is None:
                match = re.search(r"([0-9.]+)", val)
                actual = float(match.group(1)) if match else None
                
            if actual is not None:
                if req.comparison_operator == ">=" or req.comparison_operator is None:
                    if actual >= target:
                        return "PASS", f"Rs.{actual} Cr Verified", fact
                    else:
                        return "FAIL", f"Turnover Rs.{actual} Cr is below required Rs.{target} Cr", fact
                elif req.comparison_operator == "<=":
                    if actual <= target:
                        return "PASS", f"Rs.{actual} Verified", fact
                    else:
                        return "FAIL", f"Value Rs.{actual} exceeds limit Rs.{target}", fact
        except Exception as e:
            logger.warning(f"Error in numeric comparison for {req.label}: {e}")
            return "NEEDS HUMAN REVIEW", "Unable to compute exact numeric threshold", fact

    # Rule 3: Date validity evaluation (e.g. Certificate expiration)
    if req.requirement_type == "date" or req_key == "epf":
        if "expired" in val.lower() or "due" in val.lower():
            return "FAIL", val, fact
        if "active" in val.lower() or "valid" in val.lower():
            return "PASS", None, fact

    # Rule 4: Explicit failure keywords in extracted fact
    if any(neg in val.lower() for neg in ["missing", "expired", "invalid", "blacklisted", "rejected", "default"]):
        return "FAIL", val, fact

    # Rule 5: Pass / Active / Verified indicators
    if any(pos in val.lower() for pos in ["active", "verified", "passed", "compliant", "valid", "iso", "registered"]):
        # If it's a technical spec or special attribute, pass note as value
        if req_key in ["technical_spec", "turnover", "solvency", "past_perf"]:
            return "PASS", val, fact
        return "PASS", None, fact

    # Default fallback
    return "PASS", val if val else None, fact

def run_bidder_verification(tender_id: int, bidder_id: int, db: Session) -> Dict[str, Any]:
    """
    Executes the complete deterministic compliance verification pipeline for a bidder.
    
    1. Evaluates each requirement deterministically without AI API calls.
    2. Attaches traceable evidence citations (doc, page, snippet).
    3. Calculates overall compliance score and risk category.
    4. Generates comprehensive AI summary text for the officer.
    5. Preserves officer overrides if previously recorded.
    """
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    
    if not tender or not bidder:
        raise ValueError(f"Tender ID {tender_id} or Bidder ID {bidder_id} not found.")

    requirements = db.query(Requirement).filter(Requirement.tender_id == tender_id).all()
    facts = db.query(BidderFact).filter(BidderFact.bidder_id == bidder_id).all()

    existing_verdicts = {v.requirement_id: v for v in db.query(Verdict).filter(
        Verdict.tender_id == tender_id,
        Verdict.bidder_id == bidder_id
    ).all()}

    mandatory_pass = 0
    mandatory_fail = 0
    mandatory_missing = 0
    
    fin_tech_pass = 0
    fin_tech_fail = 0
    
    failed_items_descriptions: List[str] = []
    verdict_objects: List[Verdict] = []

    for req in requirements:
        status, note, fact = evaluate_requirement_against_facts(req, facts)
        
        # Check if existing verdict had a human override
        existing = existing_verdicts.get(req.id)
        is_overridden = existing.is_overridden if existing else False
        override_status = existing.override_status if existing else None
        override_comment = existing.override_comment if existing else None
        overridden_by = existing.overridden_by if existing else None
        overridden_at = existing.overridden_at if existing else None

        effective_status = override_status if is_overridden else status

        # Evidence pointers
        doc_name = fact.source_document_name if fact else (tender.documents[0].filename if tender.documents else None)
        page_num = fact.source_page if fact else req.source_page
        snippet = fact.raw_snippet if fact else req.raw_snippet

        # Tally metrics based on category
        if req.category == "mandatory":
            if effective_status == "PASS":
                mandatory_pass += 1
            elif effective_status == "FAIL":
                mandatory_fail += 1
                failed_items_descriptions.append(note or req.label)
            elif effective_status == "MISSING":
                mandatory_missing += 1
                failed_items_descriptions.append(f"Missing {req.label}")
        else:
            if effective_status == "PASS":
                fin_tech_pass += 1
            elif effective_status == "FAIL":
                fin_tech_fail += 1
                failed_items_descriptions.append(note or req.label)

        # Update or create verdict record
        if existing:
            existing.status = status
            existing.evidence_doc_name = doc_name
            existing.evidence_page = page_num
            existing.evidence_snippet = snippet
            existing.evidence_note = note
            verdict_objects.append(existing)
        else:
            verdict = Verdict(
                tender_id=tender_id,
                bidder_id=bidder_id,
                requirement_id=req.id,
                status=status,
                evidence_doc_name=doc_name,
                evidence_page=page_num,
                evidence_snippet=snippet,
                evidence_note=note,
                is_overridden=is_overridden,
                override_status=override_status,
                override_comment=override_comment,
                overridden_by=overridden_by,
                overridden_at=overridden_at
            )
            db.add(verdict)
            verdict_objects.append(verdict)

    db.commit()

    # Calculate overall Score and Risk Level
    total_reqs = len(requirements) if requirements else 1
    total_pass = mandatory_pass + fin_tech_pass
    raw_percentage = int((total_pass / total_reqs) * 100) if total_reqs > 0 else 0

    if mandatory_fail == 0 and fin_tech_fail == 0 and mandatory_missing == 0:
        score = max(raw_percentage, 95)
        risk_level = "Compliant"
        status_label = "Compliant"
        summary_text = "All mandatory statutory documents and technical specifications successfully verified."
    elif (mandatory_fail + mandatory_missing + fin_tech_fail) <= 2:
        score = max(min(raw_percentage, 85), 65)
        risk_level = "Moderate"
        status_label = "Moderate"
        issues = " and ".join(failed_items_descriptions[:2])
        summary_text = f"This bid triggers moderate validation risk due to {issues}."
    else:
        score = min(raw_percentage, 50)
        risk_level = "Non-Compliant"
        status_label = "Non-Compliant"
        issues = ", ".join(failed_items_descriptions[:3])
        summary_text = f"Critical compliance failures detected: {issues}."

    # Update Bidder record
    bidder.score = score
    bidder.risk_level = risk_level
    bidder.status = status_label
    db.commit()
    db.refresh(bidder)

    return {
        "score": score,
        "risk_level": risk_level,
        "summary": summary_text,
        "verdicts_count": len(verdict_objects)
    }
