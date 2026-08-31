import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";
import ComplianceRing from "../components/ComplianceRing";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const RISK_OPTIONS = ["All", "Compliant", "Moderate", "Non-Compliant", "Pending"];

// ── Score color helper ──────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 85) return "text-status-pass";
  if (score >= 60) return "text-status-warn";
  return "text-status-fail";
}

// ── Skeleton card ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1">
          <div className="skeleton h-3.5 w-3/4 rounded mb-2" />
          <div className="skeleton h-2.5 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-2.5 w-full rounded mb-2" />
      <div className="skeleton h-2.5 w-2/3 rounded" />
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function BiddersPage() {
  const navigate = useNavigate();
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Register new bidder
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regTenderId, setRegTenderId] = useState("");
  const [regGemRef, setRegGemRef] = useState("");
  const [regBidValue, setRegBidValue] = useState("");
  const [registering, setRegistering] = useState(false);
  const [tendersList, setTendersList] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // Load tenders, then for each tender load its bidders
      const tendersRes = await fetch(`${API_BASE_URL}/tenders`);
      if (!tendersRes.ok) throw new Error("Backend offline");
      const tenders = await tendersRes.json();
      setTendersList(tenders);

      const allBidders = [];
      for (const t of tenders) {
        try {
          const bRes = await fetch(`${API_BASE_URL}/tenders/${t.id}/bidders`);
          if (bRes.ok) {
            const bs = await bRes.json();
            bs.forEach((b) => allBidders.push({ ...b, tenderDisplayId: t.display_id, tenderTitle: t.title }));
          }
        } catch {}
      }
      setBidders(allBidders.length ? allBidders : FALLBACK_BIDDERS);
    } catch (e) {
      setBidders(FALLBACK_BIDDERS);
      showToast("Using cached bidder data (backend offline).", "warn");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regName.trim() || !regTenderId) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tenders/${regTenderId}/bidders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          gem_bid_ref: regGemRef.trim() || `GEM-BID-${Date.now()}`,
          bid_value: regBidValue.trim() || "TBD",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`Bidder "${regName}" registered successfully!`);
      setShowRegister(false);
      setRegName(""); setRegTenderId(""); setRegGemRef(""); setRegBidValue("");
      await loadAll();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setRegistering(false);
    }
  }

  // Filter
  const filtered = bidders.filter((b) => {
    const matchSearch =
      !search ||
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.display_id?.toLowerCase().includes(search.toLowerCase());
    const matchRisk =
      riskFilter === "All" ||
      b.risk_level === riskFilter ||
      b.status === riskFilter;
    return matchSearch && matchRisk;
  });

  // Aggregate stats
  const stats = {
    total: bidders.length,
    compliant: bidders.filter((b) => ["Compliant", "Approved"].includes(b.status)).length,
    moderate: bidders.filter((b) => b.status === "Moderate").length,
    nonCompliant: bidders.filter((b) => ["Non-Compliant", "Rejected"].includes(b.status)).length,
  };

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 animate-slideInRight rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "error" ? "bg-status-fail text-white"
            : toast.type === "warn" ? "bg-status-warn-bg text-status-warn border border-status-warn/20"
            : "bg-petrol-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8 animate-fadeIn">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-950">Bidders Overview</h1>
            <p className="mt-1 text-sm text-navy-800/60">
              All registered bidders across active GeM tenders — risk scores and compliance status at a glance.
            </p>
          </div>
          <button
            id="register-bidder-btn"
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 rounded-xl bg-petrol-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-petrol-500 hover:shadow-lg"
          >
            <span className="text-lg leading-none">+</span> Register Bidder
          </button>
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 animate-slideUp">
          {[
            { label: "Total Bidders", value: stats.total, color: "text-navy-950" },
            { label: "Compliant", value: stats.compliant, color: "text-status-pass" },
            { label: "Moderate Risk", value: stats.moderate, color: "text-status-warn" },
            { label: "Non-Compliant", value: stats.nonCompliant, color: "text-status-fail" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`rounded-xl border border-border bg-card p-4 shadow-sm animate-countUp`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="text-xs font-medium text-navy-800/60">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {RISK_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                riskFilter === r
                  ? "bg-navy-950 text-white shadow-sm"
                  : "border border-border bg-card text-navy-800/70 hover:bg-surface"
              }`}
            >
              {r}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <svg className="h-4 w-4 text-navy-800/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search bidders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-36 bg-transparent text-sm outline-none text-navy-950 placeholder-navy-800/30"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border bg-card overflow-hidden">
              {[["grid", "⊞"], ["table", "≡"]].map(([m, icon]) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === m ? "bg-navy-950 text-white" : "text-navy-800/60 hover:bg-surface"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid view */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)
              : filtered.length === 0
              ? (
                <div className="col-span-full rounded-2xl border border-border bg-card p-12 text-center">
                  <p className="text-sm text-navy-800/40">No bidders found matching your filters.</p>
                </div>
              )
              : filtered.map((b, i) => (
                <div
                  key={b.id || b.name}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:border-petrol-500/30 animate-slideUp cursor-pointer"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => b.tenderDisplayId && navigate(`/tenders/${encodeURIComponent(b.tenderDisplayId)}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <ComplianceRing percent={b.score || 0} size={44} strokeWidth={4} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-950 leading-tight truncate max-w-[160px]">
                          {b.name}
                        </p>
                        <p className="text-xs text-navy-800/50 mt-0.5">
                          {b.display_id || b.gem_bid_ref || "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={b.status || b.risk_level || "Pending"} />
                  </div>

                  <div className="space-y-1.5 text-xs text-navy-800/60">
                    {b.tenderDisplayId && (
                      <p className="truncate">
                        📋 <span className="font-medium text-navy-950">{b.tenderDisplayId}</span>
                        {b.tenderTitle && ` — ${b.tenderTitle.slice(0, 30)}…`}
                      </p>
                    )}
                    {b.bid_value && (
                      <p>💰 Bid Value: <span className="font-medium text-navy-950">{b.bid_value}</span></p>
                    )}
                    {b.submitted_ago && (
                      <p>🕐 Submitted {b.submitted_ago}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className={`text-sm font-bold ${scoreColor(b.score || 0)}`}>
                      {b.score || 0}% Score
                    </span>
                    <span className="text-xs text-petrol-600 group-hover:underline font-medium">
                      View Analysis →
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Table view */}
        {viewMode === "table" && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/60 text-navy-800/60">
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Bidder</th>
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Score</th>
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Tender</th>
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Bid Value</th>
                    <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1,2,3,4,5].map((n) => (
                      <tr key={n} className="border-b border-border">
                        {[1,2,3,4,5,6].map((m) => (
                          <td key={m} className="px-5 py-3">
                            <div className="skeleton h-3.5 rounded" style={{width:`${50+m*15}px`}} />
                          </td>
                        ))}
                      </tr>
                    ))
                    : filtered.map((b, i) => (
                      <tr
                        key={b.id || b.name}
                        className="border-b border-border last:border-b-0 hover:bg-surface/60 transition-colors animate-slideUp"
                        style={{ animationDelay: `${i * 35}ms` }}
                      >
                        <td className="px-5 py-3.5 font-medium text-navy-950">{b.name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-sm font-bold ${scoreColor(b.score || 0)}`}>
                            {b.score || 0}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={b.status || "Pending"} />
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-navy-800">
                          {b.tenderDisplayId || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-navy-800">{b.bid_value || "—"}</td>
                        <td className="px-5 py-3.5">
                          {b.tenderDisplayId && (
                            <button
                              onClick={() => navigate(`/tenders/${encodeURIComponent(b.tenderDisplayId)}`)}
                              className="rounded-md border border-petrol-600 px-2.5 py-1 text-xs font-semibold text-petrol-600 hover:bg-petrol-600 hover:text-white transition-colors"
                            >
                              View Analysis
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Register Bidder Modal ────────────────────────────── */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-slideUp">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy-950">Register New Bidder</h3>
                <p className="mt-0.5 text-xs text-navy-800/60">
                  Add a bidder to a tender for compliance verification.
                </p>
              </div>
              <button
                onClick={() => setShowRegister(false)}
                className="ml-4 flex h-7 w-7 items-center justify-center rounded-full text-navy-800/40 hover:bg-surface hover:text-navy-950"
              >
                ✕
              </button>
            </div>

            <form id="register-bidder-form" onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">
                  Bidder / Company Name <span className="text-status-fail">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Saraswati Energy Solutions Pvt Ltd"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">
                  Assign to Tender <span className="text-status-fail">*</span>
                </label>
                <select
                  required
                  value={regTenderId}
                  onChange={(e) => setRegTenderId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500 bg-white"
                >
                  <option value="">Select tender…</option>
                  {tendersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_id} — {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-950 mb-1">GeM Bid Reference</label>
                  <input
                    type="text"
                    placeholder="GEM-BID-XXXXXX"
                    value={regGemRef}
                    onChange={(e) => setRegGemRef(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-950 mb-1">Bid Value</label>
                  <input
                    type="text"
                    placeholder="Rs. 1,42,50,000"
                    value={regBidValue}
                    onChange={(e) => setRegBidValue(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy-800 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="rounded-lg bg-petrol-600 px-5 py-2 text-xs font-semibold text-white hover:bg-petrol-500 disabled:opacity-50"
                >
                  {registering ? "Registering…" : "Register Bidder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback data
const FALLBACK_BIDDERS = [
  { id: 1, display_id: "bid-1", name: "Indo-Global Petro Corp", score: 96, status: "Compliant", risk_level: "Compliant", bid_value: "Rs. 2,10,00,000", tenderDisplayId: "GEM/2026/001", tenderTitle: "High-Capacity Lubricant Supplies", submitted_ago: "3 days ago" },
  { id: 2, display_id: "bid-2", name: "Western Fuel Logistics Ltd", score: 78, status: "Moderate", risk_level: "Moderate", bid_value: "Rs. 1,42,50,000", tenderDisplayId: "GEM/2026/001", tenderTitle: "High-Capacity Lubricant Supplies", submitted_ago: "3 days ago" },
  { id: 3, display_id: "bid-3", name: "Apex Valves & Pipes Pvt Ltd", score: 42, status: "Non-Compliant", risk_level: "Non-Compliant", bid_value: "Rs. 88,00,000", tenderDisplayId: "GEM/2026/012", tenderTitle: "Natural Gas Transport Pipeline Maintenance", submitted_ago: "5 days ago" },
  { id: 4, display_id: "bid-4", name: "Saraswati Energy Solutions", score: 88, status: "Compliant", risk_level: "Compliant", bid_value: "Rs. 1,85,00,000", tenderDisplayId: "GEM/2026/012", tenderTitle: "Natural Gas Transport Pipeline Maintenance", submitted_ago: "2 days ago" },
  { id: 5, display_id: "bid-5", name: "Global Gas Pipelines Group", score: 55, status: "Moderate", risk_level: "Moderate", bid_value: "Rs. 1,10,00,000", tenderDisplayId: "GEM/2026/043", tenderTitle: "Offshore Platform Safety Gear", submitted_ago: "1 day ago" },
  { id: 6, display_id: "bid-6", name: "NIC Industrial Supplies Ltd", score: 92, status: "Compliant", risk_level: "Compliant", bid_value: "Rs. 3,25,00,000", tenderDisplayId: "GEM/2026/094", tenderTitle: "Strategic Petroleum Reserve", submitted_ago: "4 days ago" },
];
