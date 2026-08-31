"""
Database Seeder for GeM AI Bid Compliance Verification Platform.
Populates the SQLite database with rich demo data matching the approved Figma prototype.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import SessionLocal, Base, engine
from app.models.tender import Tender, TenderDocument
from app.models.bidder import Bidder, BidderDocument
from app.models.requirement import Requirement
from app.models.fact import BidderFact
from app.models.verdict import Verdict
from app.models.contradiction import Contradiction
from app.models.audit_log import AuditLog

def seed_database():
    print("=" * 60)
    print("SEEDING GeM BID COMPLIANCE DATABASE WITH DEMO DATA")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear previous seed
    db.query(AuditLog).delete()
    db.query(Contradiction).delete()
    db.query(Verdict).delete()
    db.query(BidderFact).delete()
    db.query(Requirement).delete()
    db.query(BidderDocument).delete()
    db.query(Bidder).delete()
    db.query(TenderDocument).delete()
    db.query(Tender).delete()
    db.commit()

    # 1. Seed Tenders
    tenders_data = [
        {"display_id": "GEM/2026/001", "title": "High-Capacity Lubricant Supplies - Mumbai Port", "status": "Verified"},
        {"display_id": "GEM/2026/012", "title": "Natural Gas Transport Pipeline Maintenance", "status": "In Progress"},
        {"display_id": "GEM/2026/043", "title": "Offshore Platform Safety Gear Procurement", "status": "In Progress"},
        {"display_id": "GEM/2026/089", "title": "Refinery Instrumentation & Valves", "status": "Pending"},
        {"display_id": "GEM/2026/094", "title": "Strategic Petroleum Reserve Storage Tanks", "status": "Verified"},
    ]

    created_tenders = {}
    for td in tenders_data:
        t = Tender(
            display_id=td["display_id"],
            title=td["title"],
            description="GeM official procurement tender notification.",
            status=td["status"]
        )
        db.add(t)
        created_tenders[td["display_id"]] = t

    db.commit()
    for t in created_tenders.values():
        db.refresh(t)

    main_tender = created_tenders["GEM/2026/001"]

    # 2. Seed Requirements for GEM/2026/001
    reqs_data = [
        # Mandatory Documents
        ("PAN Verification", "mandatory", True, "exact_match", "Active", "=="),
        ("GSTIN Active Status", "mandatory", True, "exact_match", "Active", "=="),
        ("MSME UDYAM Certificate", "mandatory", False, "exact_match", "Verified", "=="),
        ("EPF/ESIC Registration", "mandatory", True, "date", "not_expired", "not_expired"),
        
        # Financial & Technical Specs
        ("Annual Avg Turnover (> Rs.1 Cr)", "financial_technical", True, "numeric", "1.0", ">="),
        ("Bid Solvency Certificate", "financial_technical", True, "exact_match", "Bank Issued Verified", "=="),
        ("Technical Specifications Match", "financial_technical", True, "exact_match", "Grade-A Lube ISO 9001", "=="),
        ("OEM Authorization Slip", "financial_technical", True, "exact_match", "Manufacturer Stamp Verified", "=="),
        ("Past Performance Index", "financial_technical", False, "exact_match", "100/100 Rating", "=="),
        ("Supply Quality Check Index", "financial_technical", False, "exact_match", "No Default Flags", "=="),
        ("Delay Incidents Registry", "financial_technical", False, "exact_match", "Clean", "=="),
        ("Debarment/Blacklist Registry", "financial_technical", True, "exact_match", "Clean (NIC/GeM API)", "=="),
    ]

    created_reqs = []
    for label, cat, mand, rtype, target, op in reqs_data:
        r = Requirement(
            tender_id=main_tender.id,
            label=label,
            category=cat,
            is_mandatory=mand,
            requirement_type=rtype,
            target_value=target,
            comparison_operator=op,
            source_page=1,
            raw_snippet=f"Tender Clause: {label} requirement."
        )
        db.add(r)
        created_reqs.append(r)

    db.commit()
    for r in created_reqs:
        db.refresh(r)

    # 3. Seed Bidders for GEM/2026/001
    bidders_data = [
        {
            "display_id": "bid-1",
            "name": "Indo-Global Petro Corp",
            "score": 96,
            "risk_level": "Compliant",
            "status": "Compliant",
            "gem_bid_ref": "GEM-BID-9918231",
            "bid_value": "Rs. 1,38,00,000",
            "subtitle": "Direct Refinery Importer • PSU Empanelled Grade-1 Supplier",
            "submitted_ago": "3 days ago",
            "failures": []
        },
        {
            "display_id": "bid-2",
            "name": "Western Fuel Logistics Ltd",
            "score": 78,
            "risk_level": "Moderate",
            "status": "Moderate",
            "gem_bid_ref": "GEM-BID-9923212",
            "bid_value": "Rs. 1,42,50,000",
            "subtitle": "OEM Authorized Petroleum Distributor • Class-A Contractor registration in Maharashtra",
            "submitted_ago": "3 days ago",
            "failures": [
                ("EPF/ESIC Registration", "FAIL", "Expired Dec 2025"),
                ("OEM Authorization Slip", "FAIL", "Missing Manufacturer Stamp")
            ]
        },
        {
            "display_id": "bid-3",
            "name": "Apex Valves & Pipes Pvt Ltd",
            "score": 42,
            "risk_level": "Non-Compliant",
            "status": "Non-Compliant",
            "gem_bid_ref": "GEM-BID-9871234",
            "bid_value": "Rs. 1,55,00,000",
            "subtitle": "Fabrication Contractor • Registered under MSME",
            "submitted_ago": "3 days ago",
            "failures": [
                ("PAN Verification", "FAIL", "PAN Inactive in MCA registry"),
                ("EPF/ESIC Registration", "FAIL", "Defaulted Q4 2025"),
                ("Annual Avg Turnover (> Rs.1 Cr)", "FAIL", "Turnover Rs.0.6 Cr below required Rs.1 Cr"),
                ("Technical Specifications Match", "FAIL", "Non-Compliant Grade"),
            ]
        },
        {
            "display_id": "bid-4",
            "name": "Saraswati Energy Solutions",
            "score": 88,
            "risk_level": "Compliant",
            "status": "Compliant",
            "gem_bid_ref": "GEM-BID-9934812",
            "bid_value": "Rs. 1,40,00,000",
            "subtitle": "Renewable & Petrochemical Services Partner",
            "submitted_ago": "3 days ago",
            "failures": []
        }
    ]

    for bd in bidders_data:
        bidder = Bidder(
            display_id=bd["display_id"],
            tender_id=main_tender.id,
            name=bd["name"],
            score=bd["score"],
            risk_level=bd["risk_level"],
            status=bd["status"],
            gem_bid_ref=bd["gem_bid_ref"],
            bid_value=bd["bid_value"],
            subtitle=bd["subtitle"],
            submitted_ago=bd["submitted_ago"]
        )
        db.add(bidder)
        db.commit()
        db.refresh(bidder)

        # Build verdicts for each requirement
        fail_dict = {f[0]: (f[1], f[2]) for f in bd["failures"]}
        for r in created_reqs:
            if r.label in fail_dict:
                v_status, note = fail_dict[r.label]
            else:
                v_status = "PASS"
                if r.label == "Annual Avg Turnover (> Rs.1 Cr)":
                    note = "Rs.2.4 Cr Verified"
                elif r.label == "Bid Solvency Certificate":
                    note = "Bank Issued Verified"
                elif r.label == "Technical Specifications Match":
                    note = "Grade-A Lube ISO 9001"
                elif r.label == "Past Performance Index":
                    note = "Previous IOCL Contracts, 100/100 Rating"
                elif r.label == "Supply Quality Check Index":
                    note = "No Default Flags"
                elif r.label == "Delay Incidents Registry":
                    note = "2 Small Delivery Lags"
                elif r.label == "Debarment/Blacklist Registry":
                    note = "Clean (NIC/GeM API)"
                else:
                    note = None

            verdict = Verdict(
                tender_id=main_tender.id,
                bidder_id=bidder.id,
                requirement_id=r.id,
                status=v_status,
                evidence_doc_name=f"{bidder.name.replace(' ', '_')}_Certificate.pdf",
                evidence_page=1,
                evidence_snippet=f"Document submission extract for {r.label}",
                evidence_note=note
            )
            db.add(verdict)

        # Seed Contradiction for Western Fuel Logistics (bid-2)
        if bd["display_id"] == "bid-2":
            contra = Contradiction(
                bidder_id=bidder.id,
                fact_key="turnover",
                description="Conflicting turnover figures declared in Audited Financial Statements vs Tender Addendum",
                value_a="Rs. 2.4 Cr",
                source_doc_a="Audited_Balance_Sheet.pdf",
                source_page_a=2,
                value_b="Rs. 1.2 Cr",
                source_doc_b="Bid_Addendum_Form_B.pdf",
                source_page_b=1,
                severity="Critical Risk"
            )
            db.add(contra)

    db.commit()

    # 4. Seed Audit Logs
    audit_entries = [
        ("2026-03-05 14:32:11", "Compliance Approved", "GEM/2026/001", "Rajesh Kumar", "Saraswati Energy Approved"),
        ("2026-03-05 11:20:04", "Flagged Risk Triggered", "GEM/2026/012", "AI-System", "Overlapping Director on Apex Valves"),
        ("2026-03-04 17:45:50", "Uploaded Bid Files Scanned", "GEM/2026/001", "Rajesh Kumar", "EPF Expired tag placed on Western Fuel"),
        ("2026-03-04 09:12:30", "New Tender Initiated", "GEM/2026/094", "Ankita Roy", "Strategic Petroleum Storage Tender"),
        ("2026-03-03 16:30:15", "System Registry Sync", "SYSTEM", "NIC Service", "Synced PAN/GST API registries"),
        ("2026-03-03 11:15:22", "Compliance Report Downloaded", "GEM/2026/001", "Rajesh Kumar", "PDF exported for Review Board"),
    ]

    for ts_str, act, tid, who, det in audit_entries:
        log = AuditLog(
            timestamp=datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc),
            action=act,
            tender_id=tid,
            performed_by=who,
            details=det
        )
        db.add(log)

    db.commit()
    db.close()

    print("[SUCCESS] Database seeded successfully with 5 Tenders, 4 Bidders, 12 Requirements, 48 Verdicts, Contradictions, and Audit Logs!")
    print("=" * 60)

if __name__ == "__main__":
    seed_database()
