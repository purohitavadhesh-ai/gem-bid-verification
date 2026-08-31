import shutil
from pathlib import Path
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import TENDER_UPLOAD_DIR
from app.models.tender import Tender, TenderDocument
from app.models.bidder import Bidder
from app.models.requirement import Requirement
from app.schemas.tender import TenderCreate, TenderResponse, TenderDocumentResponse
from app.schemas.requirement import RequirementResponse, TenderRequirementsSummary
from app.services.extractor import extract_document_text
from app.services.ai_structuring import extract_tender_requirements

router = APIRouter(prefix="/tenders", tags=["Tenders"])

def _get_tender_or_404(tender_id: Union[int, str], db: Session) -> Tender:
    """Helper to locate tender by integer ID or display_id (e.g. GEM/2026/001)."""
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

@router.post("", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
def create_tender(tender_in: TenderCreate, db: Session = Depends(get_db)):
    """Create a new GeM procurement tender."""
    existing = db.query(Tender).filter(Tender.display_id == tender_in.display_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tender with display_id '{tender_in.display_id}' already exists."
        )

    tender = Tender(
        display_id=tender_in.display_id,
        title=tender_in.title,
        description=tender_in.description,
        status="Pending"
    )
    db.add(tender)
    db.commit()
    db.refresh(tender)
    
    # Return formatted response
    return TenderResponse(
        id=tender.id,
        display_id=tender.display_id,
        title=tender.title,
        description=tender.description,
        status=tender.status,
        created_at=tender.created_at,
        documents=[],
        bidders_count=0
    )

@router.get("", response_model=List[TenderResponse])
def list_tenders(status_filter: str = None, display_id: str = None, db: Session = Depends(get_db)):
    """List all tenders with optional status or display_id filtering."""
    query = db.query(Tender)
    if status_filter:
        query = query.filter(Tender.status == status_filter)
    if display_id:
        query = query.filter(Tender.display_id == display_id)
    tenders = query.all()

    result = []
    for t in tenders:
        bidders_cnt = db.query(Bidder).filter(Bidder.tender_id == t.id).count()
        docs = [
            TenderDocumentResponse(
                id=d.id,
                tender_id=d.tender_id,
                filename=d.filename,
                file_size=d.file_size,
                status=d.status,
                error_message=d.error_message,
                created_at=d.created_at
            ) for d in t.documents
        ]
        result.append(TenderResponse(
            id=t.id,
            display_id=t.display_id,
            title=t.title,
            description=t.description,
            status=t.status,
            created_at=t.created_at,
            documents=docs,
            bidders_count=bidders_cnt
        ))
    return result

@router.get("/by-display/{display_id:path}", response_model=TenderResponse)
def get_tender_by_display_id(display_id: str, db: Session = Depends(get_db)):
    """Get single tender details by full display_id path (e.g. GEM/2026/001)."""
    tender = db.query(Tender).filter(Tender.display_id == display_id).first()
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender with display_id '{display_id}' not found."
        )
    bidders_cnt = db.query(Bidder).filter(Bidder.tender_id == tender.id).count()
    docs = [
        TenderDocumentResponse(
            id=d.id,
            tender_id=d.tender_id,
            filename=d.filename,
            file_size=d.file_size,
            status=d.status,
            error_message=d.error_message,
            created_at=d.created_at
        ) for d in tender.documents
    ]
    return TenderResponse(
        id=tender.id,
        display_id=tender.display_id,
        title=tender.title,
        description=tender.description,
        status=tender.status,
        created_at=tender.created_at,
        documents=docs,
        bidders_count=bidders_cnt
    )

@router.get("/{tender_id}", response_model=TenderResponse)
def get_tender(tender_id: str, db: Session = Depends(get_db)):
    """Get single tender details by ID or display_id."""
    tender = _get_tender_or_404(tender_id, db)
    bidders_cnt = db.query(Bidder).filter(Bidder.tender_id == tender.id).count()
    docs = [
        TenderDocumentResponse(
            id=d.id,
            tender_id=d.tender_id,
            filename=d.filename,
            file_size=d.file_size,
            status=d.status,
            error_message=d.error_message,
            created_at=d.created_at
        ) for d in tender.documents
    ]
    return TenderResponse(
        id=tender.id,
        display_id=tender.display_id,
        title=tender.title,
        description=tender.description,
        status=tender.status,
        created_at=tender.created_at,
        documents=docs,
        bidders_count=bidders_cnt
    )

@router.post("/{tender_id}/documents", response_model=TenderDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_tender_document(
    tender_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a tender PDF specification document.
    Saves file to disk, records document in DB, and immediately executes page extraction.
    """
    tender = _get_tender_or_404(tender_id, db)
    
    # Check filename / format
    filename = file.filename or "tender_document.pdf"
    
    # Create tender upload directory
    target_dir = TENDER_UPLOAD_DIR / f"tender_{tender.id}"
    target_dir.mkdir(parents=True, exist_ok=True)
    saved_path = target_dir / filename
    
    # Save file contents
    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)
    
    file_size = len(contents)
    
    # Create DB record
    doc_record = TenderDocument(
        tender_id=tender.id,
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
        doc_type="tender",
        doc_id=doc_record.id,
        db=db
    )
    
    db.refresh(doc_record)
    return doc_record

@router.get("/{tender_id}/documents", response_model=List[TenderDocumentResponse])
def list_tender_documents(tender_id: str, db: Session = Depends(get_db)):
    """List all uploaded documents for a tender."""
    tender = _get_tender_or_404(tender_id, db)
    return tender.documents

@router.post("/{tender_id}/requirements/extract", response_model=TenderRequirementsSummary)
def extract_requirements_for_tender(tender_id: str, db: Session = Depends(get_db)):
    """
    Triggers AI-powered structuring on all uploaded tender documents to generate structured requirements.
    Uses Gemini API if configured with fallback to deterministic heuristic parser.
    """
    tender = _get_tender_or_404(tender_id, db)
    reqs = extract_tender_requirements(tender.id, db)
    
    mandatory_cnt = sum(1 for r in reqs if r.category == "mandatory")
    fin_tech_cnt = sum(1 for r in reqs if r.category == "financial_technical")
    
    return TenderRequirementsSummary(
        tender_id=tender.id,
        total_requirements=len(reqs),
        mandatory_count=mandatory_cnt,
        financial_technical_count=fin_tech_cnt,
        requirements=[RequirementResponse.model_validate(r) for r in reqs]
    )

@router.get("/{tender_id}/requirements", response_model=TenderRequirementsSummary)
def get_requirements_for_tender(tender_id: str, db: Session = Depends(get_db)):
    """Get all extracted structured requirements for a tender."""
    tender = _get_tender_or_404(tender_id, db)
    reqs = db.query(Requirement).filter(Requirement.tender_id == tender.id).all()
    
    mandatory_cnt = sum(1 for r in reqs if r.category == "mandatory")
    fin_tech_cnt = sum(1 for r in reqs if r.category == "financial_technical")
    
    return TenderRequirementsSummary(
        tender_id=tender.id,
        total_requirements=len(reqs),
        mandatory_count=mandatory_cnt,
        financial_technical_count=fin_tech_cnt,
        requirements=[RequirementResponse.model_validate(r) for r in reqs]
    )

