"""
End-to-End Master Test Suite for GeM AI Bid Compliance Verification Platform.
Validates that every single REST endpoint expected by the React Frontend runs with 100% fidelity.
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app

client = TestClient(app)

def run_master_suite():
    print("=" * 75)
    print("STARTING FULL END-TO-END SUITE ACROSS ALL PHASES & FRONTEND ENDPOINTS")
    print("=" * 75)

    # 1. Auth Endpoint (POST /auth/login)
    res = client.post("/auth/login", json={"email": "rajesh.kumar@nic.in", "password": "password123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    auth_data = res.json()
    assert "token" in auth_data and auth_data["officer"]["name"] == "Rajesh Kumar"
    print("[PASS] 1. POST /auth/login -> Authenticated Officer Rajesh Kumar")

    # 2. Dashboard Stats (GET /dashboard/stats)
    res = client.get("/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()
    assert "activeTenders" in stats and "highRiskFlagged" in stats
    print(f"[PASS] 2. GET /dashboard/stats -> Active: {stats['activeTenders']['value']}, Flagged: {stats['highRiskFlagged']['value']}")

    # 3. Active Tenders List (GET /tenders)
    res = client.get("/tenders")
    assert res.status_code == 200
    tenders = res.json()
    assert len(tenders) >= 5
    tender_001 = next(t for t in tenders if t["display_id"] == "GEM/2026/001")
    assert tender_001["bidders_count"] == 4
    print(f"[PASS] 3. GET /tenders -> Returned {len(tenders)} tenders, GEM/2026/001 has {tender_001['bidders_count']} bidders")

    # 4. Tender by Display ID (GET /tenders/by-display/GEM/2026/001)
    res = client.get("/tenders/by-display/GEM/2026/001")
    assert res.status_code == 200
    t_data = res.json()
    assert t_data["display_id"] == "GEM/2026/001"
    print(f"[PASS] 4. GET /tenders/by-display/GEM/2026/001 -> '{t_data['title']}'")

    # 5. Bidders for Tender (GET /tenders/GEM/2026/001/bidders)
    res = client.get(f"/tenders/{t_data['id']}/bidders")
    assert res.status_code == 200
    bidders = res.json()
    assert len(bidders) == 4
    print(f"[PASS] 5. GET /tenders/{{id}}/bidders -> Returned 4 bidders: {[b['name'] for b in bidders]}")

    # 6. Bidder Results (GET /tenders/{id}/bidders/{bidder_id}/results)
    res = client.get(f"/tenders/{t_data['id']}/bidders/bid-2/results")
    assert res.status_code == 200
    results = res.json()
    assert results["name"] == "Western Fuel Logistics Ltd"
    assert results["score"] == 78
    assert results["riskLevel"] == "Moderate"
    assert len(results["mandatoryDocuments"]) == 4
    assert len(results["financialTechnical"]) == 8
    assert len(results["contradictions"]) >= 1
    print(f"[PASS] 6. GET /tenders/{{id}}/bidders/bid-2/results -> Score: {results['score']}%, Risk: {results['riskLevel']}, Contradictions: {len(results['contradictions'])}")

    # 7. Officer Decision (POST /tenders/{id}/bidders/bid-2/decision)
    res = client.post(f"/tenders/{t_data['id']}/bidders/bid-2/decision", json={"decision": "approve"})
    assert res.status_code == 200
    assert res.json()["status"] == "Approved"
    print("[PASS] 7. POST /tenders/{id}/bidders/bid-2/decision -> Decision 'Approved' saved")

    # 8. Report Generation & Download (POST /tenders/{id}/bidders/{bidder_id}/report)
    res = client.post(f"/tenders/{t_data['id']}/bidders/bid-2/report")
    assert res.status_code == 200
    rep_data = res.json()
    assert rep_data["success"] is True
    download_res = client.get(rep_data["download_url"])
    assert download_res.status_code == 200 and len(download_res.content) > 1000
    print(f"[PASS] 8. POST /report & GET /reports/{rep_data['filename']} -> PDF generated ({len(download_res.content)} bytes)")

    # 9. Security Threat Matrix & Insights
    res_matrix = client.get("/security/threat-matrix")
    res_insights = client.get("/security/insights")
    res_flagged = client.get("/security/flagged-bidders")
    assert res_matrix.status_code == 200 and res_insights.status_code == 200 and res_flagged.status_code == 200
    print(f"[PASS] 9. Security Endpoints Verified (Threat Matrix, AI Insights, Flagged Bidders: {len(res_flagged.json())})")

    # 10. Audit Trail (GET /audit-logs)
    res_logs = client.get("/audit-logs")
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 6
    print(f"[PASS] 10. GET /audit-logs -> Returned {len(logs)} immutable audit log entries")

    print("=" * 75)
    print("ALL ENDPOINTS VALIDATED AND READY FOR LIVE FRONTEND INTEGRATION!")
    print("=" * 75)

if __name__ == "__main__":
    run_master_suite()
