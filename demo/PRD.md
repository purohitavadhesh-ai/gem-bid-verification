# Product Requirements Document (PRD)
## AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

| | |
|---|---|
| **Document Owner** | Procurement Technology Team |
| **Status** | Draft — Hackathon Prototype |
| **Version** | 1.0 |
| **Last Updated** | 2026-08-30 |

---

## 1. Executive Summary

Government e-Marketplace (GeM) procurement officers currently verify bidder compliance manually — reading tender documents, cross-checking bidder-submitted certificates, and comparing figures across dozens of pages per bid. This is slow, error-prone, and hard to audit.

This platform automates the **extraction and comparison** of tender requirements against bidder-submitted evidence, using AI to read documents and a **deterministic rule engine** to make PASS/FAIL/MISSING/NEEDS HUMAN REVIEW determinations. Every verdict is backed by traceable evidence (document, page, quoted text). **The system never makes the final procurement decision — a human procurement officer always does.**

### 1.1 Problem Statement
- Manual bid compliance review takes hours per bidder and is inconsistent across officers.
- Scanned/OCR documents make manual cross-referencing even slower.
- Contradictions between a bidder's own documents (e.g., turnover stated differently in two files) are easy to miss manually.
- There is no standardized, auditable evidence trail for how a compliance decision was reached.

### 1.2 Solution Summary
An end-to-end pipeline: **Upload → Extract (PDF/OCR) → AI Structuring → Deterministic Rule Engine → Evidence-Backed Verdicts → Human Review → Report**, exposed through a dashboard modeled on the approved Figma design.

### 1.3 Goals
- Reduce per-bid compliance review time significantly.
- Produce an auditable, evidence-linked verdict for every tender requirement.
- Detect intra-bidder document contradictions automatically.
- Preserve human authority over final procurement decisions at all times.

### 1.4 Non-Goals (for this prototype)
- Not a replacement for legal/statutory judgment — advisory only.
- Not handling multi-tenant / multi-department GeM-wide rollout in this phase.
- Not implementing full GeM portal integration (assume manual document upload for prototype).

---

## 2. Users & Personas

| Persona | Description | Primary Needs |
|---|---|---|
| **Procurement Officer** (e.g., Rajesh Kumar, Sr. Procurement Officer) | Reviews tenders and bids, makes final approve/reject/correction decisions | Fast, evidence-backed compliance overview; ability to override AI |
| **Tender Administrator** | Uploads/manages tender documents, initiates verification cycles | Reliable extraction; visibility into processing status |
| **Vigilance / Audit Reviewer** | Reviews audit trail post-hoc for compliance/legal purposes | Immutable logs, exportable reports |
| **AI System** (non-human actor) | Extracts structured data and proposes verdicts | N/A — internal actor, not a decision-maker |

---

## 3. System Architecture

### 3.1 Architecture Overview

```
┌─────────────┐   ┌──────────────┐   ┌────────────────┐   ┌──────────────┐   ┌──────────────┐
│   UPLOAD    │ → │  EXTRACTION  │ → │ AI STRUCTURING │ → │ RULE ENGINE  │ → │  REPORTING   │
│ Tender +    │   │ PyMuPDF text │   │ Gemini API:    │   │ Deterministic│   │ Dashboard +  │
│ Bidder docs │   │ + Tesseract  │   │ tender reqs +  │   │ Python:      │   │ PDF export   │
│             │   │ OCR fallback │   │ bidder facts   │   │ PASS/FAIL/   │   │              │
│             │   │              │   │ (JSON)         │   │ MISSING/     │   │              │
│             │   │              │   │                │   │ REVIEW +     │   │              │
│             │   │              │   │                │   │ evidence     │   │              │
└─────────────┘   └──────────────┘   └────────────────┘   └──────────────┘   └──────────────┘
                                                                    │
                                                                    ▼
                                                          ┌──────────────────┐
                                                          │  HUMAN REVIEW     │
                                                          │  Officer approves/│
                                                          │  overrides verdict│
                                                          └──────────────────┘
```

**Design principle:** AI extracts facts; a separate, auditable, non-AI rule engine decides verdicts. The officer makes the final decision. This separation is core to the product's trustworthiness in a government procurement context and must not be collapsed for convenience.

### 3.2 Component Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React (existing Figma design) | Upload UI, dashboard, bidder analysis, audit trail, report views |
| API Layer | FastAPI | Orchestrates pipeline stages, exposes REST endpoints |
| Extraction Service | PyMuPDF + Tesseract OCR | Converts PDFs (native or scanned) to page-mapped raw text |
| AI Structuring Service | Gemini API | Converts raw text into structured JSON (requirements, bidder facts) |
| Rule Engine | Pure Python (deterministic) | Compares requirements vs. bidder facts, outputs verdict + evidence |
| Contradiction Detector | Pure Python | Flags conflicting facts within a bidder's own document set |
| Report Generator | Python (PDF/HTML) | Compiles evidence-backed compliance report |
| Database | SQLite (prototype) | Stores documents, extracted text, structured data, verdicts, audit logs |
| File Storage | Local filesystem | Stores uploaded PDF files |

### 3.3 Data Flow (Detailed)

1. Officer uploads tender document → stored, extraction runs immediately.
2. Officer triggers AI requirement extraction → Gemini parses tender text → structured requirements saved.
3. Bidder documents uploaded per bidder → extraction runs.
4. AI extracts bidder facts from bidder documents.
5. Rule engine runs per requirement: locates matching bidder fact(s) → applies deterministic comparison logic → writes verdict + evidence pointer (document, page, quoted text).
6. Contradiction detector scans a bidder's own documents for conflicting values on the same fact.
7. Dashboard renders verdicts, risk scores, and contradictions.
8. Officer reviews each verdict; can accept AI's verdict or override it with a comment (audit-logged).
9. Officer triggers report generation → PDF compiled from final (human-confirmed) verdicts.
10. Every state-changing action (upload, extraction, verdict, override, report export) is written to the immutable audit log.

---

## 4. User Flows

### 4.1 Flow: Officer Login
1. Officer opens platform → Login screen.
2. Enters Officer ID/NIC Email + Password.
3. System authenticates → redirects to Dashboard.
4. **Failure path:** invalid credentials → inline error message, no redirect.

### 4.2 Flow: Tender Upload & Requirement Extraction
1. Officer navigates to Tenders → uploads tender PDF.
2. System stores file, extracts text (native or OCR).
3. Officer triggers "Extract Requirements."
4. AI returns structured requirement list; officer can view/edit extracted requirements before proceeding.
5. **Failure path:** unreadable PDF (corrupted) → system flags document as "Extraction Failed," officer notified, manual re-upload requested.

### 4.3 Flow: Bidder Document Submission & Verification
1. Officer (or system, via bulk import) registers bidders under a tender.
2. Bidder documents uploaded per bidder.
3. Extraction + AI fact extraction run automatically.
4. Officer triggers "Verify Bids" → rule engine runs comparison for each requirement.
5. Officer opens Bidder Analysis screen → sees compliance ring score, checklist (Mandatory Documents / Financial & Technical Specs), each item tagged PASS/FAIL/MISSING/NEEDS HUMAN REVIEW with evidence note.
6. Officer reviews AI summary and any flagged contradictions.
7. Officer selects **Approve**, **Flag & Reject**, or **Request Correction** — this is logged as the authoritative decision.

### 4.4 Flow: Contradiction Review
1. System surfaces detected contradictions (e.g., differing turnover figures across two bidder documents) in the Bidder Analysis and Security Insights screens.
2. Officer inspects both source documents/pages via evidence links.
3. Officer resolves manually (does not block workflow, but must be visible before final approval).

### 4.5 Flow: Audit Trail & Reporting
1. Officer/Vigilance reviewer opens Audit Trail screen.
2. Filters by date range, action type, officer.
3. Views immutable log of every action (uploads, AI flags, approvals, overrides, report exports).
4. Officer generates a compliance report (PDF) for a specific tender/bidder → downloadable, timestamped.

### 4.6 Flow: Human Override
1. Officer disagrees with an AI-proposed verdict on any requirement.
2. Officer overrides the verdict, providing a mandatory comment.
3. Both the original AI verdict and the officer's override are stored (never overwritten) — full audit trail preserved.

---

## 5. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | System shall allow upload of tender documents (PDF) | Must |
| FR-2 | System shall allow upload of multiple bidder documents per bidder | Must |
| FR-3 | System shall extract text from native (digital) PDFs using PyMuPDF | Must |
| FR-4 | System shall detect scanned/image-only pages and route them to Tesseract OCR | Must |
| FR-5 | System shall preserve page-number mapping for every extracted text segment | Must |
| FR-6 | System shall use Gemini API to extract structured tender requirements (label, category, mandatory flag, source page) | Must |
| FR-7 | System shall use Gemini API to extract structured bidder facts (fact, related category, source document, source page) | Must |
| FR-8 | System shall run a deterministic rule engine to compare each requirement against bidder facts | Must |
| FR-9 | Each requirement shall be assigned exactly one status: PASS, FAIL, MISSING, or NEEDS HUMAN REVIEW | Must |
| FR-10 | Every verdict shall include evidence: source document name, page number, and supporting text snippet | Must |
| FR-11 | System shall detect contradictions between a bidder's own documents on the same data point | Must |
| FR-12 | System shall display results in the existing Figma-based dashboard (Bidder Analysis screen) | Must |
| FR-13 | System shall allow the officer to Approve, Flag & Reject, or Request Correction for a bidder | Must |
| FR-14 | System shall allow the officer to override any individual verdict, with mandatory comment | Must |
| FR-15 | System shall never auto-finalize a procurement decision without explicit officer action | Must |
| FR-16 | System shall generate a downloadable compliance report (PDF) reflecting final human-confirmed verdicts | Must |
| FR-17 | System shall maintain an immutable, filterable audit log of all state-changing actions | Must |
| FR-18 | System shall display aggregate dashboard stats (active tenders, bids received, pending verification, high-risk flagged) | Should |
| FR-19 | System shall display an AI threat category matrix and flagged high/moderate risk bidders | Should |
| FR-20 | System shall support re-running extraction/AI structuring independently without re-uploading files | Could |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Explainability** | Every AI-derived output must be traceable to a specific document/page; no unexplained verdicts. |
| **Determinism** | The rule engine's PASS/FAIL/MISSING logic must be deterministic Python — same inputs always produce the same verdict, independent of AI model variance. |
| **Auditability** | All actions (uploads, extractions, verdicts, overrides, approvals, report generation) are immutably logged with timestamp and actor. |
| **Human Authority** | No workflow path allows the system to reach a final "approved"/"rejected" procurement state without explicit officer action. |
| **Performance** | Extraction + AI structuring for a typical bid (≤50 pages) should complete within a few minutes for a responsive demo/prototype experience. |
| **Reliability** | Extraction failures (corrupt/unreadable files) must fail gracefully with a clear status, not silently produce empty/incorrect data. |
| **Data Integrity** | Original AI verdicts are never overwritten by officer overrides — both are retained. |
| **Usability** | UI must match the approved Figma design; no redesign of frontend during backend integration. |
| **Portability** | Prototype uses SQLite and local file storage; schema should not preclude a future move to Postgres/object storage. |

---

## 7. Technical Specifications

### 7.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Tailwind CSS |
| Backend | Python 3.11+, FastAPI |
| PDF Text Extraction | PyMuPDF (fitz) |
| OCR | Tesseract (pytesseract) |
| AI | Gemini API (structured/JSON-constrained extraction) |
| Rule Engine | Pure Python (no AI calls) |
| Database | SQLite (SQLAlchemy ORM) |
| Report Generation | Python (WeasyPrint or ReportLab) |
| Version Control | Git / GitHub |

### 7.2 Core Data Model (Summary)

- **tenders** — tender metadata
- **tender_documents** — uploaded tender files
- **bidders** — bidders per tender
- **bidder_documents** — uploaded bidder files
- **extracted_pages** — raw text per page, per document, with extraction method (native/OCR)
- **requirements** — AI-extracted structured tender requirements, linked to source page
- **bidder_facts** — AI-extracted structured bidder facts, linked to source document/page
- **verdicts** — one row per (requirement × bidder): status, evidence, officer override fields
- **contradictions** — detected conflicts within a bidder's own documents
- **reports** — generated report files
- **audit_logs** — immutable action log

### 7.3 Verdict Status Definitions

| Status | Meaning |
|---|---|
| **PASS** | Bidder fact directly satisfies the requirement, with clear supporting evidence. |
| **FAIL** | Bidder fact directly contradicts or fails to meet the requirement (e.g., expired certificate, value below threshold). |
| **MISSING** | No bidder fact found addressing this requirement at all. |
| **NEEDS HUMAN REVIEW** | Evidence exists but is ambiguous, low-confidence, partially matching, or requires judgment (e.g., near-threshold values, unclear document scans). |

### 7.4 Rule Engine Logic Categories (Prototype Scope)
- **Exact match** (e.g., certificate present/absent, registry status).
- **Numeric threshold comparison** (e.g., turnover ≥ specified minimum).
- **Date validity check** (e.g., certificate expiry vs. bid submission date).
- **Keyword/category match with confidence threshold** — below threshold routes to NEEDS HUMAN REVIEW rather than guessing.

### 7.5 API Endpoints (Summary — see Architecture doc for full detail)

`POST /tenders`, `POST /tenders/{id}/requirements/extract`, `POST /bidders/{id}/documents`, `POST /bidders/{id}/extract`, `POST /tenders/{id}/bidders/{bidderId}/verify`, `GET /tenders/{id}/bidders/{bidderId}/results`, `GET /tenders/{id}/bidders/{bidderId}/contradictions`, `PATCH /verdicts/{id}`, `POST /tenders/{id}/bidders/{bidderId}/report`, `GET /audit-logs`.

---

## 8. Implementation Phases & Acceptance Criteria

### Phase 1 — Foundation (Upload & Extraction)
**Scope:** FastAPI skeleton, SQLite models, file upload endpoints, PyMuPDF extraction, Tesseract OCR fallback.

**Acceptance Criteria:**
- [ ] Officer can upload a tender PDF and receive a stored document record with a unique ID.
- [ ] Officer can upload one or more bidder PDFs associated with a bidder record.
- [ ] For a native-text PDF, extracted text matches source content per page, with correct page numbers.
- [ ] For a scanned PDF page (image-only, no extractable text layer), the system automatically routes that page to OCR and returns usable text.
- [ ] A corrupted or unreadable file upload results in a clear "Extraction Failed" status, not a silent empty result or crash.
- [ ] Raw extracted text for any document is retrievable via API for debugging/audit purposes.

### Phase 2 — AI Structuring
**Scope:** Gemini integration for tender requirement extraction and bidder fact extraction.

**Acceptance Criteria:**
- [ ] Given tender raw text, the system returns a structured list of requirements, each with a label, category, mandatory flag, and source page reference.
- [ ] Given bidder raw text, the system returns a structured list of facts, each with a value, related category, and source document/page reference.
- [ ] Extraction output is valid JSON conforming to the defined schema on at least 95% of runs during testing; malformed responses are caught and retried or flagged, not passed downstream silently.
- [ ] Extraction can be re-run for a document without re-uploading the file.

### Phase 3 — Rule Engine & Contradiction Detection (Core Value Proposition)
**Scope:** Deterministic comparator, verdict generation, evidence attachment, contradiction detection.

**Acceptance Criteria:**
- [ ] For every tender requirement, the rule engine produces exactly one verdict per bidder: PASS, FAIL, MISSING, or NEEDS HUMAN REVIEW.
- [ ] Every non-MISSING verdict includes evidence: source document name, page number, and a supporting text snippet.
- [ ] Numeric threshold requirements (e.g., minimum turnover) are correctly evaluated against extracted bidder figures.
- [ ] Date-based requirements (e.g., certificate expiry) are correctly evaluated against the current/bid submission date.
- [ ] Low-confidence or ambiguous matches are routed to NEEDS HUMAN REVIEW rather than a forced PASS/FAIL.
- [ ] Contradiction detector correctly flags at least the case of two bidder documents reporting different values for the same fact (e.g., differing turnover figures), with both source locations cited.
- [ ] Rule engine logic contains no calls to the AI/Gemini API — verified deterministic on repeated runs with identical input.

### Phase 4 — Human Review & Reporting
**Scope:** Officer override workflow, decision endpoints, report generation.

**Acceptance Criteria:**
- [ ] Officer can view all verdicts for a bidder in the Bidder Analysis screen, matching the Figma design.
- [ ] Officer can override any individual verdict; override requires a comment and is stored alongside (not replacing) the original AI verdict.
- [ ] Officer can issue a final bidder-level decision: Approve, Flag & Reject, or Request Correction.
- [ ] No bidder can reach an "Approved" or "Rejected" state without an explicit officer action recorded in the audit log.
- [ ] Officer can generate a compliance report (PDF) reflecting the final, human-confirmed verdicts and evidence.
- [ ] Generated report is downloadable and includes tender ID, bidder name, verdict summary, and evidence references.

### Phase 5 — Dashboard Integration & Audit Trail
**Scope:** Wiring the existing Figma-based React frontend to live API data; audit log screen.

**Acceptance Criteria:**
- [ ] Dashboard stat cards (Active Tenders, Bids Received, Pending Verification, High Risk Flagged) reflect live data from the backend.
- [ ] Active Tenders table reflects real tender records and their current AI verification status.
- [ ] Bidder Analysis screen renders live compliance scores, checklists, and AI summary text from the rule engine output.
- [ ] Audit Trail screen displays a complete, filterable (date range, action type, officer) log of all actions.
- [ ] Every state-changing action (upload, extraction trigger, verdict override, approval, report export) produces a corresponding audit log entry within the same request/transaction.
- [ ] No frontend visual/layout changes were made beyond data wiring — confirmed against the approved Figma design.

### Phase 6 — Polish & Demo Readiness
**Scope:** Error handling, loading states, seed/demo data, edge cases.

**Acceptance Criteria:**
- [ ] All async operations (extraction, AI calls, rule engine runs) show a loading/in-progress state in the UI.
- [ ] Empty states (no tenders, no bidders, no documents) render clear guidance rather than blank screens.
- [ ] A complete demo dataset (1 tender, 4 bidders matching the Figma mock content) can be seeded and walked through end-to-end without manual data entry during the demo.
- [ ] Known edge cases (empty upload, unsupported file type, Gemini API timeout) are handled with user-facing error messages, not unhandled exceptions.

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Gemini extraction produces inconsistent JSON structure | Breaks downstream rule engine | Enforce strict JSON schema in prompt; validate/retry on parse failure; log malformed responses |
| OCR accuracy on poor-quality scans | Incorrect or missing bidder facts | Route low-confidence OCR text to NEEDS HUMAN REVIEW rather than silent failure |
| Officer over-trusts AI verdicts | Undermines human-in-the-loop principle | UI must visually distinguish "AI-proposed" vs. "Officer-confirmed" status at all times; require explicit action to finalize |
| Rule engine misses nuanced/legal requirement types | False PASS/FAIL | Start with a conservative rule set; anything not clearly matched routes to NEEDS HUMAN REVIEW by default |
| SQLite concurrency limits | Multi-user contention at scale | Acceptable for hackathon prototype; documented as a future migration to Postgres |

---

## 10. Success Metrics (Prototype Demo)

- End-to-end pipeline (upload → extraction → AI structuring → rule engine → dashboard → report) runs successfully on the seeded demo tender and its 4 bidders.
- Every displayed verdict has traceable evidence (document + page + snippet).
- At least one contradiction is correctly detected and surfaced in the demo dataset.
- Officer can complete a full review-and-approve cycle for a bidder in under the time it would take to manually review the same bid.
- Zero instances in the demo where the system presents a final decision without officer confirmation.

---

## 11. Out of Scope for This Prototype

- GeM portal live integration (direct API pull of tenders/bids).
- Multi-department / multi-tenant access control and roles.
- Fine-grained per-category rule customization UI (rules are hardcoded per category for now).
- Cross-bidder contradiction detection (only within a single bidder's documents in this phase).
- Production-grade authentication (SSO/NIC identity integration).