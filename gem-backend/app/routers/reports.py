from pathlib import Path
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tender import Tender
from app.models.bidder import Bidder
from app.services.report_generator import generate_bidder_compliance_pdf, REPORT_DIR
from app.routers.audit import record_audit_log

router = APIRouter(tags=["Reporting"])

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

@router.post("/tenders/{tender_id}/bidders/{bidder_id}/report")
def generate_report(
    tender_id: str,
    bidder_id: str,
    db: Session = Depends(get_db)
):
    """
    Compiles and downloads an official GeM Bid Evaluation & Compliance Verification PDF Report (FR-16).
    """
    tender = _get_tender_or_404(tender_id, db)
    bidder = _get_bidder_or_404(bidder_id, db)

    file_path = generate_bidder_compliance_pdf(tender.id, bidder.id, db)
    filename = Path(file_path).name

    # Record in immutable audit trail
    record_audit_log(
        db=db,
        action="Compliance Report Downloaded",
        performed_by="Rajesh Kumar",
        details=f"Official PDF compliance report generated for {bidder.name}",
        tender_id=tender.display_id,
        bidder_id=bidder.display_id
    )

    return {
        "success": True,
        "filename": filename,
        "download_url": f"/reports/{filename}"
    }

@router.get("/reports/{filename}")
def download_report(filename: str):
    """Serve generated compliance PDF reports."""
    path = REPORT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found.")
    return FileResponse(str(path.resolve()), media_type="application/pdf", filename=filename)
