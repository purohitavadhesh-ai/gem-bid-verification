from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tender import TenderDocument
from app.models.bidder import BidderDocument
from app.models.extraction import ExtractedPage
from app.schemas.extraction import DocumentPagesSummary, ExtractedPageResponse
from app.services.extractor import extract_document_text

router = APIRouter(prefix="/documents", tags=["Documents & Extraction"])

def _get_document_or_404(doc_type: str, doc_id: int, db: Session):
    """Retrieve TenderDocument or BidderDocument record."""
    if doc_type.lower() == "tender":
        doc = db.query(TenderDocument).filter(TenderDocument.id == doc_id).first()
    elif doc_type.lower() == "bidder":
        doc = db.query(BidderDocument).filter(BidderDocument.id == doc_id).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid doc_type '{doc_type}'. Must be 'tender' or 'bidder'."
        )
        
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{doc_type.capitalize()} document ID {doc_id} not found."
        )
    return doc

@router.get("/{doc_type}/{doc_id}/pages", response_model=DocumentPagesSummary)
def get_extracted_pages(
    doc_type: str,
    doc_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve all raw extracted pages for a specific document with page numbers and extraction method.
    Used for auditing, debugging, and AI structuring pipeline.
    """
    doc = _get_document_or_404(doc_type, doc_id, db)
    
    pages = db.query(ExtractedPage).filter(
        ExtractedPage.doc_type == doc_type.lower(),
        ExtractedPage.doc_id == doc_id
    ).order_by(ExtractedPage.page_number.asc()).all()
    
    page_responses = [
        ExtractedPageResponse(
            id=p.id,
            doc_type=p.doc_type,
            doc_id=p.doc_id,
            page_number=p.page_number,
            raw_text=p.raw_text,
            method=p.method,
            character_count=p.character_count,
            created_at=p.created_at
        ) for p in pages
    ]
    
    return DocumentPagesSummary(
        doc_type=doc_type.lower(),
        doc_id=doc_id,
        filename=doc.filename,
        status=doc.status,
        error_message=doc.error_message,
        total_pages=len(page_responses),
        pages=page_responses
    )

@router.post("/{doc_type}/{doc_id}/re-extract", response_model=DocumentPagesSummary)
def re_extract_document(
    doc_type: str,
    doc_id: int,
    db: Session = Depends(get_db)
):
    """
    Re-run the extraction pipeline on an already uploaded document without re-uploading the file (FR-20).
    """
    doc = _get_document_or_404(doc_type, doc_id, db)
    
    # Re-run extraction
    extract_document_text(
        file_path=doc.file_path,
        doc_type=doc_type.lower(),
        doc_id=doc.id,
        db=db
    )
    
    db.refresh(doc)
    return get_extracted_pages(doc_type=doc_type, doc_id=doc_id, db=db)
