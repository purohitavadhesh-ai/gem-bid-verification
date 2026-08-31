from pathlib import Path
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import BIDDER_UPLOAD_DIR
from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument
from app.models.fact import BidderFact
from app.schemas.bidder import BidderCreate, BidderResponse, BidderDocumentResponse
from app.schemas.fact import BidderFactResponse, BidderFactsSummary
from app.services.extractor import extract_document_text
from app.services.ai_structuring import extract_bidder_facts

router = APIRouter(tags=["Bidders"])

def _get_tender_or_404(tender_id: Union[int, str], db: Session) -> Tender:
    """Helper to locate tender by ID or display_id."""
    if isinstance(tender_id, int) or (isinstance(tender_id, str) and tender_id.isdigit()):
        tender = db.query(Tender).filter(Tender.id == int(tender_id)).first()
    else:
        tender = db.query(Tender).filter(Tender.display_id == tender_id).first()
    
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id}' not found."
        )
    return tender

def _get_bidder_or_404(bidder_id: Union[int, str], db: Session) -> Bidder:
    """Helper to locate bidder by integer ID or display_id (e.g. 'bid-1')."""
    if isinstance(bidder_id, int) or (isinstance(bidder_id, str) and bidder_id.isdigit()):
        bidder = db.query(Bidder).filter(Bidder.id == int(bidder_id)).first()
    else:
        bidder = db.query(Bidder).filter(Bidder.display_id == bidder_id).first()
        
    if not bidder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bidder '{bidder_id}' not found."
        )
    return bidder

@router.post("/tenders/{tender_id}/bidders", response_model=BidderResponse, status_code=status.HTTP_201_CREATED)
def create_bidder_for_tender(
    tender_id: str,
    bidder_in: BidderCreate,
    db: Session = Depends(get_db)
):
    """Register a new bidder under a tender."""
    tender = _get_tender_or_404(tender_id, db)
    
    # Count current bidders to generate display_id like 'bid-1', 'bid-2'
    count = db.query(Bidder).filter(Bidder.tender_id == tender.id).count()
    display_id = f"bid-{count + 1}"

    bidder = Bidder(
        display_id=display_id,
        tender_id=tender.id,
        name=bidder_in.name,
        gem_bid_ref=bidder_in.gem_bid_ref,
        bid_value=bidder_in.bid_value,
        subtitle=bidder_in.subtitle,
        score=0,
        risk_level="Pending",
        status="Pending",
        submitted_ago="Just now"
    )
    db.add(bidder)
    db.commit()
    db.refresh(bidder)
    return bidder

@router.get("/tenders/{tender_id}/bidders", response_model=List[BidderResponse])
def list_bidders_for_tender(tender_id: str, db: Session = Depends(get_db)):
    """List all bidders participating in a given tender."""
    tender = _get_tender_or_404(tender_id, db)
    return tender.bidders

@router.get("/bidders/{bidder_id}", response_model=BidderResponse)
def get_bidder(bidder_id: str, db: Session = Depends(get_db)):
    """Get single bidder details by ID or display_id."""
    return _get_bidder_or_404(bidder_id, db)

@router.post("/bidders/{bidder_id}/documents", response_model=BidderDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_bidder_document(
    bidder_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a bidder document (e.g., PAN, GST, Balance Sheet, Technical Cert).
    Saves file to disk, records document in DB, and immediately executes page extraction.
    """
    bidder = _get_bidder_or_404(bidder_id, db)
    
    filename = file.filename or "bidder_document.pdf"
    
    target_dir = BIDDER_UPLOAD_DIR / f"bidder_{bidder.id}"
    target_dir.mkdir(parents=True, exist_ok=True)
    saved_path = target_dir / filename
    
    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)
        
    file_size = len(contents)
    
    doc_record = BidderDocument(
        bidder_id=bidder.id,
        filename=filename,
        file_path=str(saved_path.resolve()),
        file_size=file_size,
        status="PENDING"
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)
    
    # Trigger extraction immediately
    extract_document_text(
        file_path=doc_record.file_path,
        doc_type="bidder",
        doc_id=doc_record.id,
        db=db
    )
    
    db.refresh(doc_record)
    return doc_record

@router.get("/bidders/{bidder_id}/documents", response_model=List[BidderDocumentResponse])
def list_bidder_documents(bidder_id: str, db: Session = Depends(get_db)):
    """List all uploaded documents for a bidder."""
    bidder = _get_bidder_or_404(bidder_id, db)
    return bidder.documents

@router.post("/bidders/{bidder_id}/facts/extract", response_model=BidderFactsSummary)
def extract_facts_for_bidder(bidder_id: str, db: Session = Depends(get_db)):
    """
    Triggers AI-powered fact extraction on all uploaded documents for a bidder.
    Uses Gemini API if configured with fallback to deterministic heuristic parser.
    """
    bidder = _get_bidder_or_404(bidder_id, db)
    facts = extract_bidder_facts(bidder.id, db)
    
    return BidderFactsSummary(
        bidder_id=bidder.id,
        total_facts=len(facts),
        facts=[BidderFactResponse.model_validate(f) for f in facts]
    )

@router.get("/bidders/{bidder_id}/facts", response_model=BidderFactsSummary)
def get_facts_for_bidder(bidder_id: str, db: Session = Depends(get_db)):
    """Get all extracted structured facts for a bidder."""
    bidder = _get_bidder_or_404(bidder_id, db)
    facts = db.query(BidderFact).filter(BidderFact.bidder_id == bidder.id).all()
    
    return BidderFactsSummary(
        bidder_id=bidder.id,
        total_facts=len(facts),
        facts=[BidderFactResponse.model_validate(f) for f in facts]
    )

