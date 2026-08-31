import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Pipeline step config ─────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    id: "upload",
    icon: "📤",
    title: "Document Upload",
    subtitle: "PDF Ingestion",
    desc: "Tender specification and bidder certificates are uploaded via the portal.",
    tech: "React File Upload → FastAPI Storage",
    color: "border-navy-600 bg-navy-950/5",
    iconBg: "bg-navy-950",
  },
  {
    id: "extraction",
    icon: "🔍",
    title: "Text Extraction",
    subtitle: "PyMuPDF + Tesseract OCR",
    desc: "Native digital PDFs are parsed by PyMuPDF. Scanned/image pages fall back to Tesseract OCR with page-number mapping.",
    tech: "PyMuPDF → OCR Fallback → Page-mapped segments",
    color: "border-petrol-500 bg-petrol-500/5",
    iconBg: "bg-petrol-600",
  },
  {
    id: "ai_structuring",
    icon: "🤖",
    title: "AI Structuring",
    subtitle: "Gemini API",
    desc: "Gemini extracts structured tender requirements (label, category, mandatory flag) and bidder facts (PAN, GST, turnover, certifications) as JSON.",
    tech: "Google Gemini API → Structured JSON → SQLite",
    color: "border-status-review bg-status-review-bg",
    iconBg: "bg-status-review",
  },
  {
    id: "rule_engine",
    icon: "⚙️",
    title: "Deterministic Rule Engine",
    subtitle: "PASS / FAIL / MISSING / NEEDS REVIEW",
    desc: "A pure-Python comparator matches each requirement against bidder facts and outputs an evidence-backed verdict. Same inputs always produce the same verdict.",
    tech: "Python Rule Engine → Evidence pointer (doc + page + snippet)",
    color: "border-status-warn bg-status-warn-bg",
    iconBg: "bg-status-warn",
  },
  {
    id: "contradiction",
    icon: "⚡",
    title: "Contradiction Detection",
    subtitle: "Intra-Bidder Cross-Check",
    desc: "Automatic scan of all bidder documents for conflicting values on the same fact (e.g., turnover stated differently in two submissions).",
    tech: "Python Contradiction Detector → Alert on UI",
    color: "border-status-fail bg-status-fail-bg",
    iconBg: "bg-status-fail",
  },
  {
    id: "human_review",
    icon: "👤",
    title: "Human Review & Decision",
    subtitle: "Officer Authority",
    desc: "Procurement officer reviews AI verdicts, overrides any item with mandatory justification, and makes the authoritative Approve / Reject / Correction decision.",
    tech: "React UI → PATCH /verdicts/{id} → POST /decision",
    color: "border-status-pass bg-status-pass-bg",
    iconBg: "bg-status-pass",
  },
  {
    id: "report",
    icon: "📄",
    title: "Compliance Report",
    subtitle: "PDF Export",
    desc: "A timestamped, evidence-backed PDF compliance report is generated for the final human-confirmed verdicts. Recorded in the immutable audit trail.",
    tech: "ReportLab PDF → GET /reports/{file} → Audit Log",
    color: "border-navy-700 bg-navy-950/5",
    iconBg: "bg-navy-700",
  },
];

// ── Active tenders with verification status ─────────────────────────────────
function VerificationStatusBadge({ pct }) {
  if (pct === 100) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-pass-bg px-2 py-0.5 text-xs font-semibold text-status-pass">
      ✓ Complete
    </span>
  );
  if (pct === 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-warn-bg px-2 py-0.5 text-xs font-semibold text-status-warn">
      ⏳ Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-petrol-100 px-2 py-0.5 text-xs font-semibold text-petrol-600">
      ⚙ In Progress
    </span>
  );
}

export default function VerificationPage() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadTenders();
  }, []);

  async function loadTenders() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tenders`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTenders(data);
    } catch {
      setTenders(FALLBACK_TENDERS);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleVerifyAll(tenderId, tenderDisplay) {
    setVerifying(tenderId);
    try {
      // Get bidders for tender
      const bRes = await fetch(`${API_BASE_URL}/tenders/${tenderId}/bidders`);
      if (!bRes.ok) throw new Error("Could not load bidders");
      const bidders = await bRes.json();

      let successCount = 0;
      for (const b of bidders) {
        try {
          await fetch(`${API_BASE_URL}/tenders/${tenderId}/bidders/${b.id}/verify`, { method: "POST" });
          successCount++;
        } catch {}
      }
      showToast(`Verified ${successCount}/${bidders.length} bidders for ${tenderDisplay}`);
      await loadTenders();
    } catch (err) {
      showToast("Verification error: " + err.message, "error");
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 animate-slideInRight rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "error" ? "bg-status-fail text-white" : "bg-petrol-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8 animate-fadeIn">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy-950">AI Verification Pipeline</h1>
          <p className="mt-1 text-sm text-navy-800/60">
            End-to-end pipeline: Upload → OCR Extraction → AI Structuring → Rule Engine → Human Review → Report
          </p>
        </div>

        {/* Pipeline visual */}
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-navy-800/60">
            Pipeline Architecture
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.id} className="relative flex flex-col items-stretch">
                {/* Connector arrow (not for last item) */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="absolute right-0 top-1/2 -mr-3 z-10 hidden xl:flex items-center justify-center">
                    <svg className="h-5 w-5 text-petrol-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}

                <button
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center transition-all hover:shadow-md animate-slideUp ${step.color} ${
                    activeStep === step.id ? "shadow-md ring-2 ring-petrol-500/30" : ""
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-white text-lg ${step.iconBg}`}>
                    {step.icon}
                  </div>
                  <p className="text-xs font-bold text-navy-950 leading-tight">{step.title}</p>
                  <p className="text-[10px] text-navy-800/50 mt-0.5">{step.subtitle}</p>
                  <div className="mt-2 text-[10px] text-navy-800/40">Step {i + 1}</div>
                </button>

                {/* Expanded detail (mobile/small screens) */}
                {activeStep === step.id && (
                  <div className="xl:hidden mt-2 rounded-xl border border-border bg-card p-3 text-xs text-navy-800/70 animate-slideUp shadow-sm">
                    <p className="font-semibold text-navy-950 mb-1">{step.title}</p>
                    <p className="leading-relaxed">{step.desc}</p>
                    <p className="mt-2 font-mono text-[10px] text-petrol-600">{step.tech}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detail panel for desktop */}
          {activeStep && (
            <div className="hidden xl:block mt-4 rounded-2xl border border-border bg-card p-5 animate-slideUp shadow-sm">
              {(() => {
                const s = PIPELINE_STEPS.find((x) => x.id === activeStep);
                return s ? (
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white text-2xl ${s.iconBg}`}>
                      {s.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-navy-950">{s.title}</h3>
                      <p className="text-xs text-navy-800/50 mb-2">{s.subtitle}</p>
                      <p className="text-sm text-navy-800/70 leading-relaxed">{s.desc}</p>
                      <p className="mt-3 rounded-lg bg-navy-950/5 px-3 py-2 font-mono text-xs text-petrol-700">
                        {s.tech}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Active tenders */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-navy-800/60">
            Active Tender Verification Status
          </h2>

          <div className="space-y-3">
            {loading
              ? [1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-4">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="ml-auto skeleton h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))
              : tenders.map((t, i) => {
                const pct = t.status === "Verified" ? 100 : t.status === "In Progress" ? 55 : 0;
                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all animate-slideUp"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Progress ring mini */}
                      <div className="relative flex h-10 w-10 items-center justify-center">
                        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e6ec" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={pct === 100 ? "#158a5f" : pct > 0 ? "#128585" : "#e2e6ec"}
                            strokeWidth="3"
                            strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-bold text-navy-950">{pct}%</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-navy-950">{t.display_id}</span>
                          <VerificationStatusBadge pct={pct} />
                        </div>
                        <p className="text-xs text-navy-800/60 mt-0.5">{t.title}</p>
                      </div>

                      <div className="flex gap-4 text-xs text-navy-800/60">
                        <span>
                          <span className="font-semibold text-navy-950">{t.bidders_count ?? 0}</span> Bidders
                        </span>
                        <span>
                          <span className="font-semibold text-navy-950">{t.documents?.length ?? 0}</span> Docs
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/tenders/${encodeURIComponent(t.display_id)}`)}
                        className="rounded-lg border border-petrol-600 px-3 py-1.5 text-xs font-semibold text-petrol-600 hover:bg-petrol-600 hover:text-white transition-colors"
                      >
                        View Bids
                      </button>
                      <button
                        disabled={verifying === t.id || !t.bidders_count}
                        onClick={() => handleVerifyAll(t.id, t.display_id)}
                        className="rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                      >
                        {verifying === t.id && (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {verifying === t.id ? "Verifying…" : "Run Verification"}
                      </button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* How it works legend */}
        <div className="mt-10 rounded-2xl border border-border bg-navy-950 p-5 text-white">
          <h2 className="mb-3 text-sm font-semibold text-petrol-400">
            🔒 Human-in-the-Loop Design Principle
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            AI extracts facts; a separate, auditable, non-AI <strong className="text-white">rule engine</strong> decides
            verdicts. The procurement officer makes the final decision. This separation is core to the platform's
            trustworthiness in a government procurement context — the system{" "}
            <strong className="text-petrol-400">never auto-finalizes</strong> a procurement decision without explicit
            officer action.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Evidence-Linked", icon: "🔗" },
              { label: "Deterministic Verdicts", icon: "⚙️" },
              { label: "Immutable Audit Trail", icon: "📋" },
              { label: "Officer Authority", icon: "👤" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-lg">{f.icon}</p>
                <p className="mt-1 text-xs font-medium text-white/80">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

const FALLBACK_TENDERS = [
  { id: 1, display_id: "GEM/2026/001", title: "High-Capacity Lubricant Supplies - Mumbai Port", status: "Verified", bidders_count: 12, documents: [{}, {}] },
  { id: 2, display_id: "GEM/2026/012", title: "Natural Gas Transport Pipeline Maintenance", status: "In Progress", bidders_count: 8, documents: [{}] },
  { id: 3, display_id: "GEM/2026/043", title: "Offshore Platform Safety Gear Procurement", status: "Pending", bidders_count: 14, documents: [] },
];
