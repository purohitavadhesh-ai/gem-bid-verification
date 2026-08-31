# GeM AI Bid Compliance Verification Platform - Backend

AI-Powered integrated compliance verification platform for Government e-Marketplace (GeM) procurement tenders and bidder submissions.

## Architecture
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Extraction Engine**: PyMuPDF + Tesseract OCR Fallback
- **AI Structuring**: Google Gemini API (`google-genai`) with structured JSON outputs & offline heuristic fallback
- **Rule Engine**: Deterministic Python comparator (PASS / FAIL / MISSING / NEEDS HUMAN REVIEW)
- **Report Generation**: ReportLab PDF Generator

---

## Quickstart

### 1. Install Dependencies
```powershell
cd "e:\SIH 26\gem-backend"
pip install -r requirements.txt
```

### 2. Configure Environment
Your `.env` file is located at `gem-backend/.env`:
```env
GEMINI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
DEBUG=True
```

### 3. Seed Demo Data
Populates the database with 5 tenders, 4 bidders, statutory checklists, contradictions, and audit logs:
```powershell
python seed_demo_data.py
```

### 4. Run the Dev Server
```powershell
uvicorn app.main:app --reload --port 8000
```
- API Root: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

---

## Test Suites

Run individual phase test suites or the master end-to-end verification:
```powershell
# Phase 1: Upload & PDF/OCR Extraction
python test_phase1.py

# Phase 2: AI Structuring (Requirements & Facts)
python test_phase2.py

# Phase 3: Rule Engine, Contradictions & Overrides
python test_phase3.py

# Master End-to-End Test Suite (All Endpoints)
python test_all_phases.py
```
