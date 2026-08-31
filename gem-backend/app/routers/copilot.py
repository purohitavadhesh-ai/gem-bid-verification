"""
AI What-If Counter-Negotiation & Vendor Correction Copilot Router
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

router = APIRouter(prefix="/copilot", tags=["AI Copilot & Remediation"])

class CureNoticeRequest(BaseModel):
    bidder_name: str
    tender_id: str
    tender_title: str
    gem_bid_ref: str
    officer_name: str = "Rajesh Kumar"
    deficiencies: List[Dict[str, Any]]
    deadline_hours: int = 48

class CureNoticeResponse(BaseModel):
    notice_id: str
    generated_at: str
    deadline_timestamp: str
    tokenized_upload_url: str
    subject: str
    legal_cure_notice_body: str
    email_draft: str
    sms_draft: str
    deficiencies_summary: List[str]

class WhatIfRequest(BaseModel):
    bidder_id: str
    current_score: float
    remedied_items: List[str]  # e.g., ["EPF/ESIC Registration", "OEM Authorization Slip"]

class WhatIfResponse(BaseModel):
    simulated_score: float
    score_delta: float
    original_risk_level: str
    projected_risk_level: str
    qualifies_for_l1: bool
    remediation_breakdown: List[Dict[str, Any]]
    recommendation: str

@router.post("/cure-notice", response_model=CureNoticeResponse)
def generate_cure_notice(req: CureNoticeRequest):
    """
    Drafts an official, legally structured Cure Notice citing GeM GTC guidelines
    and generates email and SMS simulation payloads.
    """
    notice_id = f"GEM-CURE-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    deadline_dt = datetime.now() + timedelta(hours=req.deadline_hours)
    deadline_str = deadline_dt.strftime("%d-%b-%Y %I:%M %p IST")
    token = f"tok_{notice_id.lower()}_sec"
    upload_url = f"https://gem.gov.in/remediation/portal?token={token}"

    bullet_points = []
    for item in req.deficiencies:
        label = item.get("label", "Document")
        note = item.get("note", "Non-compliant / verification mismatch")
        bullet_points.append(f"• {label}: {note}")

    deficiencies_text = "\n".join(bullet_points) if bullet_points else "• Mandatory compliance documentation anomaly."

    subject = f"URGENT: GeM Cure Notice - Technical Bid Deficiencies for Tender {req.tender_id}"

    notice_body = f"""GOVERNMENT E-MARKETPLACE (GeM) - PROCUREMENT REMEDIATION DIRECTIVE
Ministry of Petroleum & Natural Gas, Government of India
Notice Reference: {notice_id}
Date of Issuance: {datetime.now().strftime('%d %B %Y')}

TO:
The Authorized Signatory,
{req.bidder_name}
Reference GeM Bid No: {req.gem_bid_ref}
Tender Subject: {req.tender_title} (ID: {req.tender_id})

SUBJECT: STATUTORY CURE NOTICE UNDER GeM GENERAL TERMS & CONDITIONS (GTC CL. 14.2)

Sir/Madam,

During the preliminary automated AI & technical evaluation of your bid submission for the aforementioned tender, the Competent Authority has noted the following statutory / technical non-compliance deficiencies:

{deficiencies_text}

Under Section 14.2 (Remediation of Curable Defects) of the Government e-Marketplace procurement guidelines, you are hereby granted a non-extendable period of {req.deadline_hours} hours to rectify the highlighted deficiencies.

REQUIRED ACTION:
1. Submit authentic, valid, digitally signed replacement documents via the secure tokenized portal link below:
   {upload_url}
2. Failure to upload the requisite documents before {deadline_str} shall result in the immediate forfeiture of qualification and summary rejection of Bid Ref: {req.gem_bid_ref}.

Issued with the approval of Competent Authority:
{req.officer_name}, Senior Procurement Officer
Ministry of Petroleum & Natural Gas / GeM Verification Cell
"""

    email_draft = f"""Subject: {subject}

Dear Bidder ({req.bidder_name}),

Your submission for Tender {req.tender_id} has curable non-compliance items flagged by the GeM AI Verification System:
{deficiencies_text}

You have {req.deadline_hours} hours (Deadline: {deadline_str}) to upload valid documents using your secure link:
{upload_url}

Regards,
GeM Procurement Evaluation Cell"""

    sms_draft = f"GeM ALERT: Action required for Bid {req.gem_bid_ref}. Upload curable doc before {deadline_str}. Link: {upload_url}"

    return CureNoticeResponse(
        notice_id=notice_id,
        generated_at=datetime.now().isoformat(),
        deadline_timestamp=deadline_str,
        tokenized_upload_url=upload_url,
        subject=subject,
        legal_cure_notice_body=notice_body,
        email_draft=email_draft,
        sms_draft=sms_draft,
        deficiencies_summary=[f"{i.get('label')}: {i.get('note')}" for i in req.deficiencies]
    )

@router.post("/simulate-whatif", response_model=WhatIfResponse)
def simulate_what_if(req: WhatIfRequest):
    """
    Simulates compliance score adjustment if the vendor remedies specific curable deficiencies.
    """
    # Base calculation
    added_points = 0.0
    breakdown = []

    # Map of typical defect point weights
    weights = {
        "epf/esic registration": 12.0,
        "oem authorization slip": 14.0,
        "msme udyam certificate": 8.0,
        "pan verification": 10.0,
        "gstin active status": 10.0,
        "technical specifications match": 15.0,
        "annual avg turnover (> rs.1 cr)": 15.0,
        "bid solvency certificate": 10.0
    }

    for item in req.remedied_items:
        key = item.strip().lower()
        pts = weights.get(key, 10.0)
        added_points += pts
        breakdown.append({
            "item": item,
            "potential_gain": pts,
            "status_after_remedy": "PASS"
        })

    new_score = min(100.0, round(req.current_score + added_points, 1))
    score_delta = round(new_score - req.current_score, 1)

    orig_risk = "High" if req.current_score < 50 else ("Moderate" if req.current_score < 85 else "Low")
    proj_risk = "High" if new_score < 50 else ("Moderate" if new_score < 85 else "Compliant / Low")
    qualifies = new_score >= 85.0

    rec = (
        f"Remediating {len(req.remedied_items)} item(s) elevates the score from {req.current_score}% to {new_score}%. "
        + ("Vendor transitions into the COMPLIANT bracket eligible for Commercial L1 opening." if qualifies else "Vendor remains in review threshold.")
    )

    return WhatIfResponse(
        simulated_score=new_score,
        score_delta=score_delta,
        original_risk_level=orig_risk,
        projected_risk_level=proj_risk,
        qualifies_for_l1=qualifies,
        remediation_breakdown=breakdown,
        recommendation=rec
    )
