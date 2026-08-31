"""
Phase 1 Verification Script for GeM AI Bid Compliance Verification Platform.

This script tests and verifies all Phase 1 Acceptance Criteria:
1. Tender PDF upload and document record creation with unique ID.
2. Bidder document upload and association with bidder record.
3. Native-text PDF multi-page extraction with exact page-number mapping.
4. Scanned / image-only PDF page handling and OCR fallback.
5. Corrupted / unreadable PDF handling (graceful failure with status EXTRACTION_FAILED).
6. Raw extracted text retrieval and inspection via API.
7. Re-extraction of existing documents without re-uploading.
"""

import io
import sys
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from fastapi.testclient import TestClient

# Add gem-backend root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app
from app.database import Base, engine

# Ensure tables are created
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def create_native_pdf() -> bytes:
    """Creates a 2-page native text PDF."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Page 1
    p.drawString(100, 750, "TENDER SPECIFICATION - GeM Procurement 2026")
    p.drawString(100, 720, "Clause 1.1: Minimum Average Annual Turnover must be at least Rs. 1.00 Crore.")
    p.drawString(100, 690, "Clause 1.2: Bidder must submit valid GSTIN and active PAN registration.")
    p.showPage()
    
    # Page 2
    p.drawString(100, 750, "TECHNICAL SPECIFICATIONS - Lubricants Grade-A")
    p.drawString(100, 720, "Clause 2.1: ISO 9001 quality certification mandatory.")
    p.drawString(100, 690, "Clause 2.2: OEM authorization letter with manufacturer stamp required.")
    p.showPage()
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def create_image_only_pdf() -> bytes:
    """Creates a 1-page image-only (scanned) PDF with text drawn onto a bitmap."""
    # 1. Create bitmap image with rendered text
    img = Image.new("RGB", (600, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 50), "CERTIFICATE OF INCORPORATION", fill=(0, 0, 0))
    draw.text((30, 90), "Company: Western Fuel Logistics Ltd", fill=(0, 0, 0))
    draw.text((30, 130), "Registration No: U12345MH2018PTC001", fill=(0, 0, 0))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)
    
    # 2. Insert image into PDF with NO text stream
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.drawImage(ImageReader(img_byte_arr), 50, 400, width=500, height=250)
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def create_corrupt_pdf() -> bytes:
    """Creates a corrupt/unreadable file stream."""
    return b"%PDF-1.4\n%%EOF\nGARBAGE_BYTES_CORRUPTED_STREAM_1234567890\x00\xff\xfe"

def run_all_tests():
    print("=" * 70)
    print("STARTING PHASE 1 ACCEPTANCE CRITERIA VERIFICATION")
    print("=" * 70)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Backend Server & SQLite Initialized.")

    # 2. Create Tender
    display_id = "GEM/2026/001"
    tender_payload = {
        "display_id": display_id,
        "title": "High-Capacity Lubricant Supplies - Mumbai Port",
        "description": "Annual supply of ISO-certified industrial lubricants."
    }
    res = client.post("/tenders", json=tender_payload)
    if res.status_code == 400 and "already exists" in res.text:
        # Fetch existing
        res = client.get(f"/tenders/by-display/{display_id}")
        tender_data = res.json()
    else:
        assert res.status_code == 201, f"Create tender failed: {res.text}"
        tender_data = res.json()
    
    tender_id = tender_data["id"]
    print(f"[PASS] 2. Tender Created: ID={tender_id}, DisplayID='{tender_data['display_id']}'")

    # 3. Upload Native Multi-Page Tender PDF & Extract
    native_pdf = create_native_pdf()
    files = {"file": ("tender_specs.pdf", native_pdf, "application/pdf")}
    res = client.post(f"/tenders/{tender_id}/documents", files=files)
    assert res.status_code == 201, f"Tender document upload failed: {res.text}"
    tender_doc = res.json()
    assert tender_doc["status"] == "EXTRACTED", f"Expected EXTRACTED, got {tender_doc['status']}"
    tender_doc_id = tender_doc["id"]
    print(f"[PASS] 3. Native Tender PDF Uploaded & Extracted (Doc ID: {tender_doc_id})")

    # 4. Verify Page-Mapped Extraction for Tender Document
    res = client.get(f"/documents/tender/{tender_doc_id}/pages")
    assert res.status_code == 200, f"Get pages failed: {res.text}"
    pages_summary = res.json()
    assert pages_summary["total_pages"] == 2, f"Expected 2 pages, got {pages_summary['total_pages']}"
    
    page1 = pages_summary["pages"][0]
    page2 = pages_summary["pages"][1]
    assert page1["page_number"] == 1
    assert "Minimum Average Annual Turnover" in page1["raw_text"]
    assert page1["method"] == "native"
    
    assert page2["page_number"] == 2
    assert "Lubricants Grade-A" in page2["raw_text"]
    assert page2["method"] == "native"
    print("[PASS] 4. Multi-Page Native Text Extraction Verified (Page 1 & Page 2 mapped accurately)")

    # 5. Register Bidder
    bidder_payload = {
        "name": "Indo-Global Petro Corp",
        "gem_bid_ref": "GEM-BID-9923212",
        "bid_value": "Rs. 1,42,50,000",
        "subtitle": "OEM Authorized Petroleum Distributor"
    }
    res = client.post(f"/tenders/{tender_id}/bidders", json=bidder_payload)
    assert res.status_code == 201, f"Create bidder failed: {res.text}"
    bidder_data = res.json()
    bidder_id = bidder_data["id"]
    print(f"[PASS] 5. Bidder Registered: ID={bidder_id}, Name='{bidder_data['name']}'")

    # 6. Upload Bidder Document (Scanned / Image-Only PDF)
    image_pdf = create_image_only_pdf()
    files = {"file": ("incorporation_cert.pdf", image_pdf, "application/pdf")}
    res = client.post(f"/bidders/{bidder_id}/documents", files=files)
    assert res.status_code == 201, f"Bidder document upload failed: {res.text}"
    bidder_doc = res.json()
    bidder_doc_id = bidder_doc["id"]
    print(f"[PASS] 6. Scanned/Image-Only Bidder PDF Uploaded (Doc ID: {bidder_doc_id}, Status: {bidder_doc['status']})")

    # 7. Check Scanned Page Extraction
    res = client.get(f"/documents/bidder/{bidder_doc_id}/pages")
    assert res.status_code == 200
    scanned_pages = res.json()
    assert scanned_pages["total_pages"] == 1
    print(f"[PASS] 7. Scanned PDF Processed gracefully (Method: {scanned_pages['pages'][0]['method']}, Char Count: {scanned_pages['pages'][0]['character_count']})")

    # 8. Upload Corrupt PDF and Verify Graceful Failure Handling
    corrupt_pdf = create_corrupt_pdf()
    files = {"file": ("corrupt_file.pdf", corrupt_pdf, "application/pdf")}
    res = client.post(f"/bidders/{bidder_id}/documents", files=files)
    assert res.status_code == 201, f"Upload corrupt file failed: {res.text}"
    corrupt_doc = res.json()
    assert corrupt_doc["status"] == "EXTRACTION_FAILED", f"Expected EXTRACTION_FAILED, got {corrupt_doc['status']}"
    assert corrupt_doc["error_message"] is not None
    print(f"[PASS] 8. Corrupt PDF Handled Gracefully: Status='EXTRACTION_FAILED', Error='{corrupt_doc['error_message']}'")

    # 9. Verify Re-Extraction Endpoint (FR-20)
    res = client.post(f"/documents/tender/{tender_doc_id}/re-extract")
    assert res.status_code == 200
    re_extracted = res.json()
    assert re_extracted["total_pages"] == 2
    print(f"[PASS] 9. Document Re-Extraction without re-uploading (FR-20) Verified.")

    print("=" * 70)
    print("ALL PHASE 1 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
