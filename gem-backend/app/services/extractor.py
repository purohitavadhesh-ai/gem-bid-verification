import io
import logging
from pathlib import Path
from typing import List, Optional
import pymupdf  # Modern PyMuPDF API
from PIL import Image
import pytesseract
from sqlalchemy.orm import Session

from app.models.extraction import ExtractedPage
from app.models.tender import TenderDocument
from app.models.bidder import BidderDocument

logger = logging.getLogger("gem.extractor")
logging.basicConfig(level=logging.INFO)

def _perform_ocr_on_page(page: pymupdf.Page) -> Optional[str]:
    """
    Renders a PDF page to an image and runs Tesseract OCR to extract text from scanned pages.
    Falls back gracefully if Tesseract is not installed.
    """
    try:
        # Render page to high-res image (200 DPI for reliable OCR accuracy)
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))
        
        # Run pytesseract OCR
        ocr_text = pytesseract.image_to_string(image)
        return ocr_text.strip() if ocr_text else ""
    except pytesseract.TesseractNotFoundError:
        logger.warning("Tesseract OCR executable not found on system PATH. Skipping OCR fallback.")
        return None
    except Exception as e:
        logger.warning(f"OCR processing failed for page {page.number + 1}: {e}")
        return None

def extract_document_text(
    file_path: str,
    doc_type: str,  # "tender" or "bidder"
    doc_id: int,    # ID of TenderDocument or BidderDocument
    db: Session
) -> List[ExtractedPage]:
    """
    Extracts text page-by-page from a PDF document using PyMuPDF with OCR fallback.
    
    - Validates file existence and readability.
    - Preserves exact 1-indexed page mapping.
    - Detects image-only/scanned pages and executes OCR fallback.
    - Catches corrupt/unreadable PDFs and marks status as 'EXTRACTION_FAILED'.
    - Stores ExtractedPage entries in the database.
    """
    path = Path(file_path)
    
    # 1. Fetch document DB record
    doc_record = None
    if doc_type == "tender":
        doc_record = db.query(TenderDocument).filter(TenderDocument.id == doc_id).first()
    elif doc_type == "bidder":
        doc_record = db.query(BidderDocument).filter(BidderDocument.id == doc_id).first()
    
    if not doc_record:
        raise ValueError(f"Document with type '{doc_type}' and id '{doc_id}' not found in database.")

    # 2. Check if physical file exists
    if not path.exists():
        error_msg = f"File not found on disk at path: {file_path}"
        logger.error(error_msg)
        doc_record.status = "EXTRACTION_FAILED"
        doc_record.error_message = error_msg
        db.commit()
        return []

    # 3. Clean up any previous extraction runs for this document (supports re-runs)
    db.query(ExtractedPage).filter(
        ExtractedPage.doc_type == doc_type,
        ExtractedPage.doc_id == doc_id
    ).delete()
    db.commit()

    extracted_pages: List[ExtractedPage] = []
    
    # 4. Open and process PDF via PyMuPDF
    try:
        doc = pymupdf.open(file_path)
        
        # Check if file has any pages
        if len(doc) == 0:
            error_msg = "PDF document contains 0 pages."
            logger.warning(error_msg)
            doc_record.status = "EXTRACTION_FAILED"
            doc_record.error_message = error_msg
            db.commit()
            return []

        # Process each page with page-number mapping
        for page_index in range(len(doc)):
            page_num = page_index + 1  # 1-indexed
            page = doc[page_index]
            
            # Step A: Native digital text extraction
            native_text = page.get_text("text") or ""
            cleaned_native = native_text.strip()
            
            # Step B: Determine if page is image-only / scanned
            # If native text is minimal (< 25 characters) or empty, attempt OCR fallback
            if len(cleaned_native) < 25:
                ocr_result = _perform_ocr_on_page(page)
                if ocr_result and len(ocr_result) > len(cleaned_native):
                    final_text = ocr_result
                    method = "ocr"
                else:
                    final_text = cleaned_native
                    method = "native"
            else:
                final_text = cleaned_native
                method = "native"

            # Create ExtractedPage record
            page_record = ExtractedPage(
                doc_type=doc_type,
                doc_id=doc_id,
                page_number=page_num,
                raw_text=final_text,
                method=method,
                character_count=len(final_text)
            )
            db.add(page_record)
            extracted_pages.append(page_record)

        doc.close()

        # Update document record to EXTRACTED
        doc_record.status = "EXTRACTED"
        doc_record.error_message = None
        db.commit()

        # Refresh all page records to populate IDs
        for p in extracted_pages:
            db.refresh(p)

        logger.info(f"Successfully extracted {len(extracted_pages)} pages for {doc_type} doc ID {doc_id}")
        return extracted_pages

    except Exception as e:
        error_msg = f"Extraction failed: {str(e)}"
        logger.error(f"Error extracting text from '{file_path}': {error_msg}")
        doc_record.status = "EXTRACTION_FAILED"
        doc_record.error_message = error_msg
        db.commit()
        return []
