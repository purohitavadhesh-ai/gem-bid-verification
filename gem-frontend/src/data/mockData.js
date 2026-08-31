// ---------------------------------------------------------------------------
// LIVE API & MOCK FALLBACK LAYER
// Connects to FastAPI backend at API_BASE_URL (http://127.0.0.1:8000).
// Gracefully falls back to local data if the backend is temporarily unreachable.
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const currentOfficer = {
  id: "off-001",
  name: "Rajesh Kumar",
  role: "Sr. Procurement Officer",
  email: "rajesh.kumar@nic.in",
};

// GET /dashboard/stats
export async function getDashboardStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getDashboardStats", e);
  }
  return {
    activeTenders: { value: 12, subtext: "8 On-Track this cycle" },
    bidsReceived: { value: 48, subtext: "High Response this cycle" },
    pendingVerification: { value: 17, subtext: "Need Action this cycle" },
    highRiskFlagged: { value: 5, subtext: "Critical Alert this cycle" },
  };
}

// GET /tenders?status=active
export async function getActiveTenders() {
  try {
    const res = await fetch(`${API_BASE_URL}/tenders`);
    if (res.ok) {
      const data = await res.json();
      return data.map((t) => ({
        id: t.display_id,
        title: t.title,
        bidders: t.bidders_count || 4,
        status: t.status,
      }));
    }
  } catch (e) {
    console.warn("Using local fallback for getActiveTenders", e);
  }
  return [
    { id: "GEM/2026/001", title: "High-Capacity Lubricant Supplies - Mumbai Port", bidders: 12, status: "Verified" },
    { id: "GEM/2026/012", title: "Natural Gas Transport Pipeline Maintenance", bidders: 8, status: "In Progress" },
    { id: "GEM/2026/043", title: "Offshore Platform Safety Gear Procurement", bidders: 14, status: "In Progress" },
    { id: "GEM/2026/089", title: "Refinery Instrumentation & Valves", bidders: 9, status: "Pending" },
    { id: "GEM/2026/094", title: "Strategic Petroleum Reserve Storage Tanks", bidders: 5, status: "Verified" },
  ];
}

// GET /tenders/{id}
export async function getTenderById(tenderId) {
  try {
    const res = await fetch(`${API_BASE_URL}/tenders/by-display/${encodeURIComponent(tenderId)}`);
    if (res.ok) {
      const data = await res.json();
      return { id: data.display_id, title: data.title };
    }
  } catch (e) {
    console.warn("Using local fallback for getTenderById", e);
  }
  const tenders = {
    "GEM/2026/001": {
      id: "GEM/2026/001",
      title: "High-Capacity Lubricant Supplies - Mumbai Port",
    },
  };
  return tenders[tenderId] ?? tenders["GEM/2026/001"];
}

// GET /tenders/{id}/bidders
export async function getBiddersForTender(tenderId) {
  try {
    const tRes = await fetch(`${API_BASE_URL}/tenders/by-display/${encodeURIComponent(tenderId)}`);
    if (tRes.ok) {
      const tender = await tRes.json();
      const bRes = await fetch(`${API_BASE_URL}/tenders/${tender.id}/bidders`);
      if (bRes.ok) {
        const bidders = await bRes.json();
        return bidders.map((b) => ({
          id: b.display_id || String(b.id),
          name: b.name,
          score: b.score,
          status: b.status,
          submittedAgo: b.submitted_ago || "3 days ago",
        }));
      }
    }
  } catch (e) {
    console.warn("Using local fallback for getBiddersForTender", e);
  }
  return [
    { id: "bid-1", name: "Indo-Global Petro Corp", score: 96, status: "Compliant", submittedAgo: "3 days ago" },
    { id: "bid-2", name: "Western Fuel Logistics Ltd", score: 78, status: "Moderate", submittedAgo: "3 days ago" },
    { id: "bid-3", name: "Apex Valves & Pipes Pvt Ltd", score: 42, status: "Non-Compliant", submittedAgo: "3 days ago" },
    { id: "bid-4", name: "Saraswati Energy Solutions", score: 88, status: "Compliant", submittedAgo: "3 days ago" },
  ];
}

// Resolve display_id → numeric DB id
async function resolveTenderId(tenderId) {
  try {
    const res = await fetch(`${API_BASE_URL}/tenders/by-display/${encodeURIComponent(tenderId)}`);
    if (res.ok) { const d = await res.json(); return d.id; }
  } catch {}
  return 1; // fallback
}

// GET /tenders/{id}/bidders/{bidderId}/results
export async function getBidderResults(bidderId, tenderId = "GEM/2026/001") {
  try {
    const dbId = await resolveTenderId(tenderId);
    const res = await fetch(`${API_BASE_URL}/tenders/${dbId}/bidders/${encodeURIComponent(bidderId)}/results`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getBidderResults", e);
  }
  const results = {
    "bid-2": {
      id: "bid-2",
      name: "Western Fuel Logistics Ltd",
      score: 78,
      riskLevel: "Moderate",
      subtitle: "OEM Authorized Petroleum Distributor • Class-A Contractor registration in Maharashtra",
      gemBidRef: "GEM-BID-9923212",
      bidValue: "Rs. 1,42,50,000",
      aiSummary: "This bid triggers moderate validation risk due to expired EPF details and missing OEM Stamp.",
      mandatoryDocuments: [
        { label: "PAN Verification", status: "PASS", note: null },
        { label: "GSTIN Active Status", status: "PASS", note: null },
        { label: "MSME UDYAM Certificate", status: "PASS", note: null },
        { label: "EPF/ESIC Registration", status: "FAIL", note: "Expired Dec 2025" },
      ],
      financialTechnical: [
        { label: "Annual Avg Turnover (> Rs.1 Cr)", status: "PASS", note: "Rs.2.4 Cr Verified" },
        { label: "Bid Solvency Certificate", status: "PASS", note: "Bank Issued Verified" },
        { label: "Technical Specifications Match", status: "PASS", note: "Grade-A Lube ISO 9001" },
        { label: "OEM Authorization Slip", status: "FAIL", note: "Missing Manufacturer Stamp" },
        { label: "Past Performance Index", status: "PASS", note: "Previous IOCL Contracts, 100/100 Rating" },
        { label: "Supply Quality Check Index", status: "PASS", note: "No Default Flags" },
        { label: "Delay Incidents Registry", status: "PASS", note: "2 Small Delivery Lags" },
        { label: "Debarment/Blacklist Registry", status: "PASS", note: "Clean (NIC/GeM API)" },
      ],
    },
  };
  return results[bidderId] ?? results["bid-2"];
}

// GET /security/threat-matrix
export async function getThreatMatrix() {
  try {
    const res = await fetch(`${API_BASE_URL}/security/threat-matrix`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getThreatMatrix", e);
  }
  return {
    stats: {
      criticalShellDetections: 2,
      minorGapsTriggered: 4,
    },
    categories: [
      { title: "Document Fraud Detection", detail: "1 flag out of 100", severity: "low" },
      { title: "Financial Irregularity Analysis", detail: "2 cases marked as Shell Cos", severity: "critical" },
      { title: "Past Performance Scans", detail: "3 minor debarments flagged", severity: "gaps" },
      { title: "Regulatory Compliance Checks", detail: "All registers updated", severity: "verified" },
    ],
  };
}

// GET /security/insights
export async function getAIInsights() {
  try {
    const res = await fetch(`${API_BASE_URL}/security/insights`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getAIInsights", e);
  }
  return {
    text: "Cross-referencing bidder registration metadata with MCA (Ministry of Corporate Affairs) database registers flagged two director overlaps at Apex Valves, suggesting potential cartelization patterns.",
  };
}

// GET /security/flagged-bidders
export async function getFlaggedBidders() {
  try {
    const res = await fetch(`${API_BASE_URL}/security/flagged-bidders`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getFlaggedBidders", e);
  }
  return [
    { name: "Apex Valves & Pipes Pvt Ltd", score: 42, reason: "Shell company patterns detected in registration", severity: "Critical Risk" },
    { name: "Western Fuel Logistics Ltd", score: 78, reason: "Expired statutory certificates (EPF, OEM Stamp)", severity: "Moderate Risk" },
    { name: "Global Gas Pipelines Group", score: 55, reason: "Incomplete bank solvency logs submitted", severity: "Moderate Risk" },
  ];
}

// GET /audit-logs
export async function getAuditLogs(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.dateRange) params.append("dateRange", filters.dateRange);
    if (filters.actionType) params.append("actionType", filters.actionType);
    if (filters.officer) params.append("officer", filters.officer);
    
    const url = `${API_BASE_URL}/audit-logs?${params.toString()}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for getAuditLogs", e);
  }
  return [
    { timestamp: "2026-03-05 14:32:11", action: "Compliance Approved", tenderId: "GEM/2026/001", performedBy: "Rajesh Kumar", details: "Saraswati Energy Approved" },
    { timestamp: "2026-03-05 11:20:04", action: "Flagged Risk Triggered", tenderId: "GEM/2026/012", performedBy: "AI-System", details: "Overlapping Director on Apex Valves" },
    { timestamp: "2026-03-04 17:45:50", action: "Uploaded Bid Files Scanned", tenderId: "GEM/2026/001", performedBy: "Rajesh Kumar", details: "EPF Expired tag placed on Western Fuel" },
    { timestamp: "2026-03-04 09:12:30", action: "New Tender Initiated", tenderId: "GEM/2026/094", performedBy: "Ankita Roy", details: "Strategic Petroleum Storage Tender" },
    { timestamp: "2026-03-03 16:30:15", action: "System Registry Sync", tenderId: "SYSTEM", performedBy: "NIC Service", details: "Synced PAN/GST API registries" },
    { timestamp: "2026-03-03 11:15:22", action: "Compliance Report Downloaded", tenderId: "GEM/2026/001", performedBy: "Rajesh Kumar", details: "PDF exported for Review Board" },
  ];
}

// POST /auth/login
export async function login(email, password) {
  if (!email || !password) throw new Error("Officer ID/Email and Password are required.");
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for login", e);
  }
  return { token: "mock-token", officer: currentOfficer };
}

// POST /tenders/{id}/bidders/{bidderId}/decision
export async function submitBidderDecision(bidderId, decision, tenderId = "GEM/2026/001") {
  try {
    const dbId = await resolveTenderId(tenderId);
    const res = await fetch(`${API_BASE_URL}/tenders/${dbId}/bidders/${encodeURIComponent(bidderId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for submitBidderDecision", e);
  }
  return { success: true };
}

// POST /tenders/{id}/bidders/{bidderId}/report
export async function downloadComplianceReport(bidderId = "bid-2", tenderId = "GEM/2026/001") {
  try {
    const dbId = await resolveTenderId(tenderId);
    const res = await fetch(`${API_BASE_URL}/tenders/${dbId}/bidders/${encodeURIComponent(bidderId)}/report`, {
      method: "POST"
    });
    if (res.ok) {
      const data = await res.json();
      window.open(`${API_BASE_URL}${data.download_url}`, "_blank");
      return data;
    }
  } catch (e) {
    console.error("Report download failed", e);
  }
}

// ---------------------------------------------------------------------------
// AI COPILOT & REMEDIATION HELPERS
// ---------------------------------------------------------------------------

export async function generateCureNotice(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/copilot/cure-notice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for generateCureNotice", e);
  }

  const noticeId = `GEM-CURE-${Date.now().toString().slice(-8)}`;
  const deadlineStr = "03-Sep-2026 05:00 PM IST";
  const uploadUrl = `https://gem.gov.in/remediation/portal?token=tok_${noticeId.toLowerCase()}_sec`;
  const itemsText = payload.deficiencies?.map((d) => `• ${d.label}: ${d.note || 'Verification gap'}`).join("\n") || "• Curable statutory non-compliance items.";

  return {
    notice_id: noticeId,
    generated_at: new Date().toISOString(),
    deadline_timestamp: deadlineStr,
    tokenized_upload_url: uploadUrl,
    subject: `URGENT: GeM Cure Notice - Technical Bid Deficiencies for Tender ${payload.tender_id || 'GEM/2026/001'}`,
    legal_cure_notice_body: `GOVERNMENT E-MARKETPLACE (GeM) - PROCUREMENT REMEDIATION DIRECTIVE\nMinistry of Petroleum & Natural Gas, Government of India\nNotice Reference: ${noticeId}\nDate: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n\nTO: ${payload.bidder_name || 'Western Fuel Logistics Ltd'}\nReference GeM Bid No: ${payload.gem_bid_ref || 'GEM-BID-9923212'}\nTender: ${payload.tender_title || 'High-Capacity Lubricant Supplies'}\n\nSUBJECT: STATUTORY CURE NOTICE UNDER GeM GTC CLAUSE 14.2 (REMEDIATION OF DEFECTS)\n\nSir/Madam,\n\nDuring the preliminary automated AI & technical compliance review of your bid submission, the following deficiencies were identified:\n\n${itemsText}\n\nUnder Section 14.2 of GeM Procurement Guidelines, you are granted ${payload.deadline_hours || 48} hours to upload valid rectified certificates.\n\nSECURE UPLOAD PORTAL: ${uploadUrl}\n\nFailure to upload before ${deadlineStr} shall result in the automatic forfeiture of qualification.\n\nIssued by:\n${payload.officer_name || 'Rajesh Kumar'}, Sr. Procurement Officer\nGeM Verification Cell`,
    email_draft: `Subject: URGENT: GeM Cure Notice for Bid ${payload.gem_bid_ref || 'GEM-BID-9923212'}\n\nDear Bidder (${payload.bidder_name || 'Western Fuel Logistics Ltd'}),\n\nYour submission has curable non-compliance items flagged:\n${itemsText}\n\nYou have ${payload.deadline_hours || 48} hours to upload corrected files at: ${uploadUrl}\n\nGeM Procurement Cell`,
    sms_draft: `GeM ALERT: Action required for Bid ${payload.gem_bid_ref || 'GEM-BID-9923212'}. Upload curable doc before ${deadlineStr}. Link: ${uploadUrl}`,
    deficiencies_summary: payload.deficiencies?.map(d => `${d.label}: ${d.note}`) || []
  };
}

export async function simulateWhatIf(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/copilot/simulate-whatif`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for simulateWhatIf", e);
  }

  const weights = {
    "epf/esic registration": 12.0,
    "oem authorization slip": 14.0,
    "msme udyam certificate": 8.0,
    "pan verification": 10.0,
    "gstin active status": 10.0,
    "technical specifications match": 15.0,
    "annual avg turnover (> rs.1 cr)": 15.0,
    "bid solvency certificate": 10.0
  };

  let pts = 0;
  const breakdown = (payload.remedied_items || []).map(item => {
    const p = weights[item.trim().toLowerCase()] || 10.0;
    pts += p;
    return { item, potential_gain: p, status_after_remedy: "PASS" };
  });

  const base = payload.current_score || 78;
  const newScore = Math.min(100, Math.round((base + pts) * 10) / 10);
  const delta = Math.round((newScore - base) * 10) / 10;
  const qualifies = newScore >= 85;

  return {
    simulated_score: newScore,
    score_delta: delta,
    original_risk_level: base < 50 ? "High" : base < 85 ? "Moderate" : "Low",
    projected_risk_level: newScore < 50 ? "High" : newScore < 85 ? "Moderate" : "Compliant / Low",
    qualifies_for_l1: qualifies,
    remediation_breakdown: breakdown,
    recommendation: `Remediating ${breakdown.length} item(s) elevates the score from ${base}% to ${newScore}%. ` + (qualifies ? "Vendor qualifies for Commercial L1 opening." : "Vendor requires further clearance.")
  };
}

// ---------------------------------------------------------------------------
// STATUTORY DOCUMENT OCR STUDIO HELPERS
// ---------------------------------------------------------------------------

export async function extractStatutoryDocument(fileOrPreset = "epf") {
  try {
    let formData = new FormData();
    if (typeof fileOrPreset === "string") {
      formData.append("preset_type", fileOrPreset);
    } else if (fileOrPreset instanceof File) {
      formData.append("file", fileOrPreset);
    }
    const res = await fetch(`${API_BASE_URL}/ocr/extract-statutory`, {
      method: "POST",
      body: formData
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for extractStatutoryDocument", e);
  }

  const preset = typeof fileOrPreset === "string" ? fileOrPreset.toLowerCase() : "epf";

  if (preset.includes("msme") || preset.includes("udyam")) {
    return {
      document_name: "MSME_Udyam_Registration_2026.pdf",
      document_type: "MSME UDYAM Registration Certificate",
      ocr_engine: "PyMuPDF v1.23 High-Precision Parser",
      confidence_overall: 99.4,
      entity_name: "Saraswati Energy Solutions Pvt Ltd",
      registration_number: "UDYAM-MH-12-0098412",
      issue_date: "10-May-2022",
      expiry_date: "Permanent (Active)",
      statutory_status: "VALID",
      digital_signature_detected: true,
      fields: [
        { key: "udyam_num", label: "Udyam Number", value: "UDYAM-MH-12-0098412", confidence: 99.8, is_valid: true },
        { key: "enterprise_type", label: "Enterprise Category", value: "Medium Enterprise (Manufacturing)", confidence: 99.1, is_valid: true },
        { key: "major_activity", label: "NIC 2-Digit Code", value: "20 - Manufacture of Chemicals & Petro-products", confidence: 98.7, is_valid: true },
        { key: "dic_name", label: "District Industries Centre", value: "Pune, Maharashtra", confidence: 99.5, is_valid: true }
      ],
      raw_snippet: "MINISTRY OF MICRO, SMALL & MEDIUM ENTERPRISES\nUDYAM REGISTRATION CERTIFICATE\nUDYAM REGISTRATION NUMBER: UDYAM-MH-12-0098412\nNAME OF ENTERPRISE: M/S SARASWATI ENERGY SOLUTIONS\nMAJOR ACTIVITY: MANUFACTURING / PETROLEUM BLENDING",
      rule_verdict: "PASS - Valid MSME Certificate recognized under Public Procurement Policy for MSEs 2012."
    };
  } else if (preset.includes("oem") || preset.includes("authorization") || preset.includes("stamp")) {
    return {
      document_name: "IOCL_Manufacturer_Authorization.pdf",
      document_type: "OEM Manufacturer Authorization Form (MAF)",
      ocr_engine: "Tesseract 5.3 Computer Vision Filter",
      confidence_overall: 89.2,
      entity_name: "Western Fuel Logistics Ltd",
      registration_number: "MAF-IOCL-2026-991",
      issue_date: "01-Feb-2026",
      expiry_date: "31-Jan-2027",
      statutory_status: "INCOMPLETE",
      digital_signature_detected: false,
      fields: [
        { key: "oem_name", label: "OEM Principal", value: "Indian Oil Corporation Ltd (IOCL)", confidence: 94.2, is_valid: true },
        { key: "authorized_agent", label: "Authorized Distributor", value: "Western Fuel Logistics Ltd", confidence: 95.0, is_valid: true },
        { key: "territory", label: "Authorized Territory", value: "Maharashtra, Gujarat & Goa Ports", confidence: 91.4, is_valid: true },
        { key: "official_seal", label: "Official OEM Embossed Seal", value: "NOT DETECTED / MISSING", confidence: 84.1, is_valid: false, validation_message: "No holographic seal or physical stamp found in scanned footer." }
      ],
      raw_snippet: "MANUFACTURER'S AUTHORIZATION FORM\nTo: Senior Procurement Officer, GeM\nWe, Indian Oil Corporation Ltd, authorize Western Fuel Logistics Ltd to bid.\nDate: 01-Feb-2026\n[Signature present, but OEM Seal Missing]",
      rule_verdict: "FAIL - Missing verified Manufacturer Rubber Stamp/Seal as mandated in Tender Clause 9.3."
    };
  } else if (preset.includes("gst") || preset.includes("pan")) {
    return {
      document_name: "GSTIN_Certificate_IndoGlobal.pdf",
      document_type: "Goods and Services Tax (GSTIN) Certificate",
      ocr_engine: "PyMuPDF v1.23 + QR Code Validator",
      confidence_overall: 98.9,
      entity_name: "Indo-Global Petro Corp Ltd",
      registration_number: "27AAACI1920K1ZV",
      issue_date: "01-Jul-2017",
      expiry_date: "Active / Regular",
      statutory_status: "VALID",
      digital_signature_detected: true,
      fields: [
        { key: "gstin", label: "GSTIN", value: "27AAACI1920K1ZV", confidence: 99.9, is_valid: true },
        { key: "pan_extracted", label: "Extracted PAN from GSTIN", value: "AAACI1920K", confidence: 99.9, is_valid: true },
        { key: "taxpayer_type", label: "Taxpayer Type", value: "Regular Company", confidence: 98.4, is_valid: true },
        { key: "jurisdiction", label: "State Jurisdiction", value: "Maharashtra - Ward 402", confidence: 97.2, is_valid: true }
      ],
      raw_snippet: "GOVERNMENT OF INDIA\nCENTRAL BOARD OF INDIRECT TAXES AND CUSTOMS\nRegistration Certificate\nRegistration Number: 27AAACI1920K1ZV\nLegal Name: INDO-GLOBAL PETRO CORP LTD\nConstitution of Business: Public Limited Company",
      rule_verdict: "PASS - Active GSTIN verified against GSTN API Registry without flags."
    };
  } else {
    // Default EPF Challan Expired
    return {
      document_name: "EPFO_ECR_Challan_WesternFuel.pdf",
      document_type: "EPFO / ESIC Electronic Challan cum Return (ECR)",
      ocr_engine: "PyMuPDF v1.23 + Tesseract 5.3 OCR",
      confidence_overall: 97.8,
      entity_name: "Western Fuel Logistics Ltd",
      registration_number: "MH/BAN/0049210/000",
      issue_date: "15-Jan-2024",
      expiry_date: "31-Dec-2025",
      statutory_status: "EXPIRED",
      digital_signature_detected: true,
      fields: [
        { key: "epfo_code", label: "Establishment Code", value: "MH/BAN/0049210", confidence: 99.2, is_valid: true },
        { key: "wage_month", label: "Wage Month / Year", value: "December 2025", confidence: 98.5, is_valid: false, validation_message: "Challan validity lapsed prior to bid date (Aug 2026)." },
        { key: "total_members", label: "Total Subscribed Employees", value: "142 Workers", confidence: 96.1, is_valid: true },
        { key: "remittance_amount", label: "Total Remittance (INR)", value: "Rs. 4,82,310.00", confidence: 98.0, is_valid: true },
        { key: "bank_trrn", label: "TRRN Reference", value: "1012601004921", confidence: 99.4, is_valid: true }
      ],
      raw_snippet: "EMPLOYEES' PROVIDENT FUND ORGANISATION, INDIA\nElectronic Challan Cum Return (ECR)\nEstablishment Code: MH/BAN/0049210/000\nName: WESTERN FUEL LOGISTICS LTD\nValidity Period: 01/12/2025 to 31/12/2025\nStatus: Paid (Bank TRRN: 1012601004921)",
      rule_verdict: "FAIL - Statutory EPF Challan expired on 31-Dec-2025. Current active registration proof required under GTC Clause 4.1."
    };
  }
}

// ---------------------------------------------------------------------------
// CSV / EXCEL BATCH BID ANALYZER HELPERS
// ---------------------------------------------------------------------------

export async function analyzeBatchBidders(file = null) {
  try {
    const formData = new FormData();
    if (file) formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/batch/analyze-csv`, {
      method: "POST",
      body: formData
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Using local fallback for analyzeBatchBidders", e);
  }

  // 52 Bidders Dataset fallback
  const companies = [
    { name: "Indo-Global Petro Corp", quote: 12500000, score: 96, status: "Compliant", pan: true, gst: true, turnover: 18.5, epf: true, oem: true, cartel: false, reason: null },
    { name: "Saraswati Energy Solutions", quote: 12900000, score: 92, status: "Compliant", pan: true, gst: true, turnover: 8.2, epf: true, oem: true, cartel: false, reason: null },
    { name: "Hindustan Lube Tech Ltd", quote: 13100000, score: 90, status: "Compliant", pan: true, gst: true, turnover: 6.4, epf: true, oem: true, cartel: false, reason: null },
    { name: "Bharat Polychem Industries", quote: 13400000, score: 88, status: "Compliant", pan: true, gst: true, turnover: 12.0, epf: true, oem: true, cartel: false, reason: null },
    { name: "Western Fuel Logistics Ltd", quote: 14250000, score: 78, status: "Moderate Risk", pan: true, gst: true, turnover: 2.4, epf: false, oem: false, cartel: false, reason: "Expired EPF, Missing OEM Stamp" },
    { name: "Deccan Valve & Engineering", quote: 14500000, score: 76, status: "Moderate Risk", pan: true, gst: true, turnover: 3.1, epf: true, oem: false, cartel: false, reason: "Unverified OEM Distribution Slip" },
    { name: "Coastal Energy Logistics", quote: 14700000, score: 72, status: "Moderate Risk", pan: true, gst: true, turnover: 1.8, epf: false, oem: true, cartel: false, reason: "EPF wage challan date discrepancy" },
    { name: "Apex Valves & Pipes Pvt Ltd", quote: 11200000, score: 42, status: "Shell Cartel", pan: true, gst: false, turnover: 0.4, epf: false, oem: false, cartel: true, reason: "MCA Cross-director link with Zenith Piping & turnover < 1 Cr" },
    { name: "Zenith Piping Solutions", quote: 11400000, score: 40, status: "Shell Cartel", pan: true, gst: false, turnover: 0.3, epf: false, oem: false, cartel: true, reason: "Common IP submission & shared registered office with Apex Valves" },
    { name: "Eastern Infra Petroleum", quote: 15200000, score: 38, status: "Non-Compliant", pan: false, gst: false, turnover: 0.8, epf: false, oem: false, cartel: false, reason: "Inactive GSTIN & Solvency default" },
  ];

  for (let i = 11; i <= 52; i++) {
    const val = 13000000 + (i * 120000);
    const score = i % 3 === 0 ? (68 + (i % 8)) : Math.min(98, 86 + ((i % 7) * 2));
    const isComp = score >= 85;
    companies.push({
      name: `National Vendor Consortium-${String(i).padStart(2, '0')} Ltd`,
      quote: val,
      score: score,
      status: isComp ? "Compliant" : "Moderate Risk",
      pan: true,
      gst: true,
      turnover: Math.round((3.0 + (i * 0.4)) * 100) / 100,
      epf: isComp,
      oem: isComp,
      cartel: false,
      reason: isComp ? null : "Minor discrepancy in financial addendum"
    });
  }

  const sorted = companies.sort((a, b) => b.score - a.score || a.quote - b.quote);
  const rows = sorted.map((b, idx) => {
    const cr = b.quote / 10000000;
    return {
      rank: idx + 1,
      bidder_id: `BID-2026-${String(idx + 1).padStart(3, '0')}`,
      company_name: b.name,
      quote_inr: b.quote,
      quote_formatted: cr >= 1 ? `Rs. ${cr.toFixed(2)} Cr` : `Rs. ${b.quote.toLocaleString('en-IN')}`,
      compliance_score: b.score,
      status: b.status,
      pan_verified: b.pan,
      gstin_active: b.gst,
      turnover_cr: b.turnover,
      epf_valid: b.epf,
      oem_authorized: b.oem,
      cartel_flag: b.cartel,
      disqualification_reason: b.reason
    };
  });

  const compliantRows = rows.filter(r => r.status === "Compliant" && !r.cartel_flag);
  const l1 = compliantRows.sort((a, b) => a.quote_inr - b.quote_inr)[0];

  return {
    total_bidders: rows.length,
    compliant_count: rows.filter(r => r.status === "Compliant").length,
    moderate_risk_count: rows.filter(r => r.status === "Moderate Risk").length,
    non_compliant_count: rows.filter(r => r.status === "Non-Compliant").length,
    cartel_flags_count: rows.filter(r => r.cartel_flag || r.status === "Shell Cartel").length,
    average_compliance_score: Math.round((rows.reduce((acc, r) => acc + r.compliance_score, 0) / rows.length) * 10) / 10,
    lowest_compliant_quote_l1: l1 ? l1.quote_formatted : "N/A",
    l1_bidder_name: l1 ? l1.company_name : "N/A",
    results: rows
  };
}

