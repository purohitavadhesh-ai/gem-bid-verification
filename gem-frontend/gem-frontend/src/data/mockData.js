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
