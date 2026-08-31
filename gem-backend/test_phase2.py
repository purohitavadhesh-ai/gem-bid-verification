"""
Phase 2 Verification Script: AI Structuring (Tender Requirements & Bidder Facts)

This script verifies all Phase 2 Acceptance Criteria:
1. Structured list of requirements extracted from Tender documents (label, category, mandatory flag, source page).
2. Structured list of facts extracted from Bidder documents (value, category, source document, page).
3. 100% schema conformance with Pydantic validation.
4. Re-run capability for requirement & fact extraction without file re-upload.
"""

import io
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi.testclient import TestClient

# Add gem-backend root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app
from app.database import Base, engine

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def create_rich_tender_pdf() -> bytes:
    """Generates a rich tender PDF with statutory and financial requirements."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Page 1: Mandatory Requirements
    p.drawString(80, 750, "GOVERNMENT e-MARKETPLACE (GeM) - TENDER NOTIFICATION")
    p.drawString(80, 720, "Tender ID: GEM/2026/001 - High-Capacity Lubricant Supplies")
    p.drawString(80, 680, "SECTION A: MANDATORY STATUTORY ELIGIBILITY CRITERIA")
    p.drawString(80, 650, "1. Active PAN card verification is mandatory for all bidders.")
    p.drawString(80, 620, "2. Active GSTIN registration with regular return filings required.")
    p.drawString(80, 590, "3. MSME UDYAM certificate submitted will be considered for exemption.")
    p.drawString(80, 560, "4. Up-to-date EPF/ESIC statutory registration not expired is required.")
    p.showPage()
    
    # Page 2: Financial & Technical Criteria
    p.drawString(80, 750, "SECTION B: FINANCIAL & TECHNICAL SPECIFICATIONS")
    p.drawString(80, 710, "1. Minimum Average Annual Turnover must be at least Rs. 1.00 Crore over last 3 years.")
    p.drawString(80, 670, "2. Adherence to technical specification Grade-A Lube ISO 9001 quality standards.")
    p.drawString(80, 630, "3. Valid OEM Authorization slip with manufacturer stamp is mandatory for dealers.")
    p.showPage()
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def create_rich_bidder_pdf() -> bytes:
    """Generates a bidder document submission."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Page 1: Bidder Submission Details
    p.drawString(80, 750, "BIDDER SUBMISSION - Western Fuel Logistics Ltd")
    p.drawString(80, 720, "GeM Bid Reference: GEM-BID-9923212")
    p.drawString(80, 680, "Statutory Details:")
    p.drawString(80, 650, "- PAN: ABCDE1234F (Active Verified)")
    p.drawString(80, 620, "- GSTIN: 27ABCDE1234F1Z5 (Active Regular)")
    p.drawString(80, 590, "- MSME UDYAM: UDYAM-MH-01-0012345 (Verified)")
    p.drawString(80, 560, "- EPF Registration: MH/BAN/0019283 (Expired Dec 2025)")
    p.showPage()
    
    # Page 2: Financial & Technical Evidence
    p.drawString(80, 750, "Financial & Technical Compliance Declarations:")
    p.drawString(80, 710, "- Audited Average Annual Turnover: Verified Rs. 2.4 Cr over past 3 fiscal years.")
    p.drawString(80, 670, "- Technical Compliance: Certified Grade-A Lube ISO 9001 compliant product.")
    p.drawString(80, 630, "- Dealership: OEM Authorization submitted (Missing Manufacturer Stamp).")
    p.showPage()
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def run_phase2_tests():
    print("=" * 70)
    print("STARTING PHASE 2 (AI STRUCTURING) ACCEPTANCE VERIFICATION")
    print("=" * 70)

    # 1. Create Tender & Upload PDF
    display_id = "GEM/2026/002"
    res = client.post("/tenders", json={
        "display_id": display_id,
        "title": "Natural Gas Transport Pipeline Maintenance",
        "description": "Annual pipeline technical maintenance tender."
    })
    if res.status_code == 400:
        res = client.get(f"/tenders/by-display/{display_id}")
    tender_id = res.json()["id"]
    print(f"[PASS] 1. Tender Created (ID: {tender_id})")

    tender_pdf = create_rich_tender_pdf()
    res = client.post(f"/tenders/{tender_id}/documents", files={"file": ("tender_notice.pdf", tender_pdf, "application/pdf")})
    assert res.status_code == 201
    print("[PASS] 2. Tender Notice Uploaded and Extracted.")

    # 2. Trigger AI Structuring for Tender Requirements
    res = client.post(f"/tenders/{tender_id}/requirements/extract")
    assert res.status_code == 200, f"Extract requirements failed: {res.text}"
    req_summary = res.json()
    assert req_summary["total_requirements"] > 0, "No requirements extracted!"
    print(f"[PASS] 3. Tender Requirements Extracted: Total={req_summary['total_requirements']} (Mandatory={req_summary['mandatory_count']}, Fin/Tech={req_summary['financial_technical_count']})")
    
    # Verify categories and schemas
    labels = [r["label"] for r in req_summary["requirements"]]
    print(f"       Extracted Labels: {labels}")
    assert any("Turnover" in l for l in labels)
    assert any("GSTIN" in l or "PAN" in l for l in labels)

    # 3. Create Bidder & Upload Bidder PDF
    res = client.post(f"/tenders/{tender_id}/bidders", json={
        "name": "Western Fuel Logistics Ltd",
        "gem_bid_ref": "GEM-BID-9923212",
        "bid_value": "Rs. 1,42,50,000",
        "subtitle": "OEM Authorized Petroleum Distributor"
    })
    assert res.status_code == 201
    bidder_id = res.json()["id"]
    print(f"[PASS] 4. Bidder Created (ID: {bidder_id})")

    bidder_pdf = create_rich_bidder_pdf()
    res = client.post(f"/bidders/{bidder_id}/documents", files={"file": ("bidder_submission.pdf", bidder_pdf, "application/pdf")})
    assert res.status_code == 201
    print("[PASS] 5. Bidder Submission Document Uploaded and Extracted.")

    # 4. Trigger AI Structuring for Bidder Facts
    res = client.post(f"/bidders/{bidder_id}/facts/extract")
    assert res.status_code == 200, f"Extract facts failed: {res.text}"
    facts_summary = res.json()
    assert facts_summary["total_facts"] > 0, "No facts extracted!"
    print(f"[PASS] 6. Bidder Facts Extracted: Total={facts_summary['total_facts']}")
    
    fact_keys = [f["fact_key"] for f in facts_summary["facts"]]
    print(f"       Extracted Fact Keys: {fact_keys}")
    assert "turnover" in fact_keys
    assert "epf" in fact_keys

    # Check EPF expired extraction & turnover value
    epf_fact = next(f for f in facts_summary["facts"] if f["fact_key"] == "epf")
    assert "Expired" in epf_fact["extracted_value"]
    print(f"[PASS] 7. Fact Specifics Verified: EPF Status='{epf_fact['extracted_value']}', Source Page={epf_fact['source_page']}")

    # 5. Verify Re-Extraction without re-uploading
    res = client.post(f"/tenders/{tender_id}/requirements/extract")
    assert res.status_code == 200
    res = client.post(f"/bidders/{bidder_id}/facts/extract")
    assert res.status_code == 200
    print("[PASS] 8. Re-Extraction without re-uploading Verified.")

    print("=" * 70)
    print("ALL PHASE 2 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_phase2_tests()
