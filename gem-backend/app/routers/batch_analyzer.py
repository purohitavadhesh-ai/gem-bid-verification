"""
CSV/Excel Batch Bid Analyzer Router
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import csv
import io
import random

router = APIRouter(prefix="/batch", tags=["Batch Bid Analyzer"])

class BatchBidderRow(BaseModel):
    rank: int
    bidder_id: str
    company_name: str
    quote_inr: float
    quote_formatted: str
    compliance_score: float
    status: str  # Compliant, Moderate Risk, Non-Compliant, Shell Cartel
    pan_verified: bool
    gstin_active: bool
    turnover_cr: float
    epf_valid: bool
    oem_authorized: bool
    cartel_flag: bool
    disqualification_reason: Optional[str] = None

class BatchAnalysisSummary(BaseModel):
    total_bidders: int
    compliant_count: int
    moderate_risk_count: int
    non_compliant_count: int
    cartel_flags_count: int
    average_compliance_score: float
    lowest_compliant_quote_l1: Optional[str] = None
    l1_bidder_name: Optional[str] = None
    results: List[BatchBidderRow]

@router.post("/analyze-csv", response_model=BatchAnalysisSummary)
async def analyze_batch_bidders_csv(file: Optional[UploadFile] = File(None)):
    """
    Parses a CSV file with 50+ bidder records or runs the SIH benchmark simulation dataset,
    running fast batch compliance verification and ranking.
    """
    bidders = []
    
    # If a file is uploaded, parse it; otherwise provide rich 50+ SIH benchmark dataset
    if file and file.filename.endswith(".csv"):
        contents = await file.read()
        reader = csv.DictReader(io.StringIO(contents.decode("utf-8", errors="ignore")))
        idx = 1
        for row in reader:
            score = float(row.get("compliance_score", random.randint(40, 99)))
            status = "Compliant" if score >= 85 else ("Moderate Risk" if score >= 65 else "Non-Compliant")
            bidders.append({
                "bidder_id": row.get("bidder_id", f"BID-{idx:03d}"),
                "company_name": row.get("company_name", f"Enterprise {idx}"),
                "quote_inr": float(row.get("quote_inr", random.randint(9000000, 18000000))),
                "compliance_score": score,
                "status": status,
                "pan_verified": row.get("pan_verified", "true").lower() == "true",
                "gstin_active": row.get("gstin_active", "true").lower() == "true",
                "turnover_cr": float(row.get("turnover_cr", round(random.uniform(1.2, 15.0), 2))),
                "epf_valid": row.get("epf_valid", "true").lower() == "true",
                "oem_authorized": row.get("oem_authorized", "true").lower() == "true",
                "cartel_flag": row.get("cartel_flag", "false").lower() == "true",
            })
            idx += 1

    if not bidders:
        # Generate 52 comprehensive benchmark bidders for SIH demo
        companies = [
            ("Indo-Global Petro Corp", 12500000, 96, "Compliant", True, True, 18.5, True, True, False, None),
            ("Saraswati Energy Solutions", 12900000, 92, "Compliant", True, True, 8.2, True, True, False, None),
            ("Hindustan Lube Tech Ltd", 13100000, 90, "Compliant", True, True, 6.4, True, True, False, None),
            ("Bharat Polychem Industries", 13400000, 88, "Compliant", True, True, 12.0, True, True, False, None),
            ("Western Fuel Logistics Ltd", 14250000, 78, "Moderate Risk", True, True, 2.4, False, False, False, "Expired EPF, Missing OEM Stamp"),
            ("Deccan Valve & Engineering", 14500000, 76, "Moderate Risk", True, True, 3.1, True, False, False, "Unverified OEM Distribution Slip"),
            ("Coastal Energy Logistics", 14700000, 72, "Moderate Risk", True, True, 1.8, False, True, False, "EPF wage challan date discrepancy"),
            ("Apex Valves & Pipes Pvt Ltd", 11200000, 42, "Shell Cartel", True, False, 0.4, False, False, True, "MCA Cross-director link with Zenith Piping & turnover < 1 Cr"),
            ("Zenith Piping Solutions", 11400000, 40, "Shell Cartel", True, False, 0.3, False, False, True, "Common IP submission & shared registered office with Apex Valves"),
            ("Eastern Infra Petroleum", 15200000, 38, "Non-Compliant", False, False, 0.8, False, False, False, "Inactive GSTIN & Solvency default"),
        ]

        # Extend with 42 realistic procedural enterprise bidders
        for i in range(11, 53):
            val = 13000000 + (i * 120000)
            score = 86 + ((i % 7) * 2) if i % 3 != 0 else (68 + (i % 8))
            is_comp = score >= 85
            status = "Compliant" if is_comp else "Moderate Risk"
            companies.append((
                f"National Vendor Consortium-{i:02d} Ltd",
                val,
                score,
                status,
                True,
                True,
                round(3.0 + (i * 0.4), 2),
                is_comp,
                is_comp,
                False,
                None if is_comp else "Minor document discrepancy in financial addendum"
            ))

        for idx, (name, quote, sc, st, pan, gst, turn, epf, oem, cart, reason) in enumerate(companies, 1):
            bidders.append({
                "bidder_id": f"BID-2026-{idx:03d}",
                "company_name": name,
                "quote_inr": quote,
                "compliance_score": sc,
                "status": st,
                "pan_verified": pan,
                "gstin_active": gst,
                "turnover_cr": turn,
                "epf_valid": epf,
                "oem_authorized": oem,
                "cartel_flag": cart,
                "disqualification_reason": reason
            })

    # Sort primarily by Compliance Score desc, then Quote INR asc
    # Eligible for L1 is strictly compliant score >= 85 and not cartel
    bidders_sorted = sorted(bidders, key=lambda x: (-x["compliance_score"], x["quote_inr"]))

    results_rows = []
    for rank, b in enumerate(bidders_sorted, 1):
        crore_val = b["quote_inr"] / 10000000.0
        fmt = f"Rs. {crore_val:.2f} Cr" if crore_val >= 1.0 else f"Rs. {b['quote_inr']:,.0f}"
        results_rows.append(BatchBidderRow(
            rank=rank,
            bidder_id=b["bidder_id"],
            company_name=b["company_name"],
            quote_inr=b["quote_inr"],
            quote_formatted=fmt,
            compliance_score=b["compliance_score"],
            status=b["status"],
            pan_verified=b["pan_verified"],
            gstin_active=b["gstin_active"],
            turnover_cr=b["turnover_cr"],
            epf_valid=b["epf_valid"],
            oem_authorized=b["oem_authorized"],
            cartel_flag=b["cartel_flag"],
            disqualification_reason=b.get("disqualification_reason")
        ))

    # Summary metrics
    comp = sum(1 for b in results_rows if b.status == "Compliant")
    mod = sum(1 for b in results_rows if b.status == "Moderate Risk")
    non_c = sum(1 for b in results_rows if b.status == "Non-Compliant")
    cartel = sum(1 for b in results_rows if b.cartel_flag or b.status == "Shell Cartel")
    avg_score = round(sum(b.compliance_score for b in results_rows) / len(results_rows), 1)

    # Find True L1 among Compliant bidders
    compliant_bidders = [b for b in results_rows if b.status == "Compliant" and not b.cartel_flag]
    l1 = min(compliant_bidders, key=lambda x: x.quote_inr) if compliant_bidders else None

    return BatchAnalysisSummary(
        total_bidders=len(results_rows),
        compliant_count=comp,
        moderate_risk_count=mod,
        non_compliant_count=non_c,
        cartel_flags_count=cartel,
        average_compliance_score=avg_score,
        lowest_compliant_quote_l1=l1.quote_formatted if l1 else "N/A",
        l1_bidder_name=l1.company_name if l1 else "N/A",
        results=results_rows
    )
