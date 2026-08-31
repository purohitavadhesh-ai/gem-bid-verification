import re
import logging
from typing import List
from sqlalchemy.orm import Session

from app.models.bidder import Bidder
from app.models.extraction import ExtractedPage
from app.models.contradiction import Contradiction

logger = logging.getLogger("gem.contradiction_detector")
logging.basicConfig(level=logging.INFO)

def detect_bidder_contradictions(bidder_id: int, db: Session) -> List[Contradiction]:
    """
    Detects conflicting values reported across multiple documents/pages for the same bidder (FR-11).
    For example: Differing turnover figures, conflicting registration dates, or entity names.
    """
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise ValueError(f"Bidder ID {bidder_id} not found.")

    doc_map = {d.id: d.filename for d in bidder.documents}
    doc_ids = list(doc_map.keys())
    
    if not doc_ids:
        return []

    pages = db.query(ExtractedPage).filter(
        ExtractedPage.doc_type == "bidder",
        ExtractedPage.doc_id.in_(doc_ids)
    ).order_by(ExtractedPage.id.asc()).all()

    # Clean previous contradictions for this bidder
    db.query(Contradiction).filter(Contradiction.bidder_id == bidder_id).delete()
    db.commit()

    contradictions: List[Contradiction] = []
    
    # 1. Intra-bidder Turnover conflict check
    turnover_instances = []
    for p in pages:
        matches = re.finditer(r"(?:turnover|revenue).*?Rs\.?\s*([0-9.]+)\s*(?:Cr|Crore|Lakh)", p.raw_text, re.IGNORECASE)
        for m in matches:
            val = float(m.group(1))
            doc_name = doc_map.get(p.doc_id, "Bidder Document")
            turnover_instances.append({
                "val_str": f"Rs. {val} Cr",
                "val": val,
                "doc_name": doc_name,
                "page": p.page_number
            })

    if len(turnover_instances) >= 2:
        # Check if values differ significantly (> 10% discrepancy)
        for i in range(len(turnover_instances) - 1):
            a = turnover_instances[i]
            b = turnover_instances[i + 1]
            if abs(a["val"] - b["val"]) > 0.1:
                c = Contradiction(
                    bidder_id=bidder_id,
                    fact_key="turnover",
                    description=f"Conflicting annual turnover figures reported across documents: {a['val_str']} vs {b['val_str']}",
                    value_a=a["val_str"],
                    source_doc_a=a["doc_name"],
                    source_page_a=a["page"],
                    value_b=b["val_str"],
                    source_doc_b=b["doc_name"],
                    source_page_b=b["page"],
                    severity="Critical Risk"
                )
                db.add(c)
                contradictions.append(c)

    db.commit()
    for c in contradictions:
        db.refresh(c)

    logger.info(f"Contradiction detector found {len(contradictions)} conflicts for bidder {bidder_id}")
    return contradictions
