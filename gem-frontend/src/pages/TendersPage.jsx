import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── helpers ────────────────────────────────────────────────────────────────
async function fetchTenders() {
  const res = await fetch(`${API_BASE_URL}/tenders`);
  if (!res.ok) throw new Error("Failed to load tenders");
  return res.json();
}

async function createTender(payload) {
  const res = await fetch(`${API_BASE_URL}/tenders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadTenderDoc(tenderId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE_URL}/tenders/${tenderId}/documents`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function extractRequirements(tenderId) {
  const res = await fetch(`${API_BASE_URL}/tenders/${tenderId}/requirements/extract`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <td key={n} className="px-5 py-3">
          <div className="skeleton h-3.5 rounded" style={{ width: `${50 + n * 10}px` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function TendersPage() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [displayId, setDisplayId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tenderFile, setTenderFile] = useState(null);
  const [creating, setCreating] = useState(false);

  // Requirements extraction
  const [extractingId, setExtractingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadTenders();
  }, []);

  async function loadTenders() {
    setLoading(true);
    try {
      const data = await fetchTenders();
      setTenders(data);
    } catch (e) {
      // showToast("Could not reach backend. Showing fallback data.", "warn");
      setTenders(FALLBACK_TENDERS);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!displayId.trim() || !title.trim()) return;
    setCreating(true);
    try {
      const tender = await createTender({
        display_id: displayId.trim(),
        title: title.trim(),
        description: description.trim() || "GeM procurement tender.",
      });
      if (tenderFile) {
        await uploadTenderDoc(tender.id, tenderFile);
        await extractRequirements(tender.id);
      }
      showToast(`Tender ${tender.display_id} created successfully!`);
      setShowCreate(false);
      setDisplayId(""); setTitle(""); setDescription(""); setTenderFile(null);
      await loadTenders();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleExtractRequirements(tenderId) {
    setExtractingId(tenderId);
    try {
      const result = await extractRequirements(tenderId);
      showToast(`Extracted ${result.total_requirements} requirements with AI!`);
      await loadTenders();
    } catch (err) {
      showToast("Extraction failed: " + err.message, "error");
    } finally {
      setExtractingId(null);
    }
  }

  // Filter
  const filtered = tenders.filter((t) => {
    const matchSearch =
      !searchQuery ||
      t.display_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    All: tenders.length,
    Pending: tenders.filter((t) => t.status === "Pending").length,
    "In Progress": tenders.filter((t) => t.status === "In Progress").length,
    Verified: tenders.filter((t) => t.status === "Verified").length,
  };

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 animate-slideInRight rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "bg-status-fail text-white"
              : toast.type === "warn"
              ? "bg-status-warn-bg text-status-warn border border-status-warn/20"
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
            <h1 className="text-2xl font-bold text-navy-950">Tenders Management</h1>
            <p className="mt-1 text-sm text-navy-800/60">
              Manage GeM procurement tenders, upload specification PDFs, and trigger AI requirement extraction.
            </p>
          </div>
          <button
            id="create-tender-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg animate-pulse-ring"
          >
            <span className="text-lg leading-none">+</span> Create New Tender
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {Object.entries(statusCounts).map(([s, cnt]) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === s
                  ? "bg-navy-950 text-white shadow-sm"
                  : "border border-border bg-card text-navy-800/70 hover:bg-surface"
              }`}
            >
              {s} <span className="ml-1 text-xs opacity-60">({cnt})</span>
            </button>
          ))}

          {/* Search */}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            <svg className="h-4 w-4 text-navy-800/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tenders…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 bg-transparent text-sm outline-none text-navy-950 placeholder-navy-800/30"
            />
          </div>
        </div>

        {/* Tenders table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-navy-800/60">
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Tender ID</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Bidders</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Documents</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1, 2, 3, 4, 5].map((n) => <SkeletonRow key={n} />)
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-navy-800/40">
                        No tenders found.{" "}
                        <button onClick={() => setShowCreate(true)} className="text-petrol-600 hover:underline">
                          Create one now
                        </button>
                      </td>
                    </tr>
                  )
                  : filtered.map((t, i) => (
                    <tr
                      key={t.id}
                      className={`border-b border-border last:border-b-0 hover:bg-surface/60 transition-colors animate-slideUp`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          className="font-mono text-xs font-semibold text-petrol-600 hover:underline"
                        >
                          {t.display_id}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-navy-950 max-w-xs">
                        <span className="line-clamp-1">{t.title}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 text-navy-800">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-navy-950">{t.bidders_count ?? 0}</span>
                          <span className="text-xs text-navy-800/50">bidders</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-800">
                        <span className="text-sm font-semibold text-navy-950">
                          {t.documents?.length ?? 0}
                        </span>
                        <span className="ml-1 text-xs text-navy-800/50">docs</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => navigate(`/tenders/${encodeURIComponent(t.display_id)}`)}
                            className="rounded-md border border-petrol-600 px-2.5 py-1 text-xs font-semibold text-petrol-600 hover:bg-petrol-600 hover:text-white transition-colors"
                          >
                            Verify Bids
                          </button>
                          <button
                            disabled={extractingId === t.id}
                            onClick={() => handleExtractRequirements(t.id)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-navy-800/70 hover:bg-surface disabled:opacity-50 transition-colors"
                          >
                            {extractingId === t.id ? "Extracting…" : "Extract Reqs"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary footer */}
        {!loading && (
          <p className="mt-3 text-xs text-navy-800/40 text-right">
            Showing {filtered.length} of {tenders.length} registered tenders
          </p>
        )}
      </main>

      {/* ── Create Tender Modal ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border animate-slideUp">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-navy-950">Create New Procurement Tender</h3>
                <p className="mt-0.5 text-xs text-navy-800/60">
                  Fill in tender details and optionally upload a specification PDF for AI requirement extraction.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="ml-4 flex h-7 w-7 items-center justify-center rounded-full text-navy-800/40 hover:bg-surface hover:text-navy-950"
              >
                ✕
              </button>
            </div>

            <form id="create-tender-form" onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-950 mb-1">
                    Tender Display ID <span className="text-status-fail">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GEM/2026/105"
                    value={displayId}
                    onChange={(e) => setDisplayId(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500 focus:ring-2 focus:ring-petrol-500/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-950 mb-1">
                    Tender Title <span className="text-status-fail">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cryogenic Tank Insulation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500 focus:ring-2 focus:ring-petrol-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief procurement description…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">
                  Tender Notice PDF
                  <span className="ml-1 font-normal text-navy-800/50">(Optional — triggers AI extraction)</span>
                </label>
                <div className="rounded-xl border-2 border-dashed border-border p-4 text-center hover:border-petrol-500 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setTenderFile(e.target.files[0])}
                    className="w-full text-xs text-navy-800 file:mr-3 file:rounded-lg file:border-0 file:bg-petrol-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-petrol-500 cursor-pointer"
                  />
                  {tenderFile && (
                    <p className="mt-2 text-xs font-medium text-petrol-700">
                      📄 {tenderFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy-800 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-navy-950 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {creating ? "Creating & Extracting…" : "Create Tender"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback data when backend is offline
const FALLBACK_TENDERS = [
  { id: 1, display_id: "GEM/2026/001", title: "High-Capacity Lubricant Supplies - Mumbai Port", status: "Verified", bidders_count: 12, documents: [{}, {}] },
  { id: 2, display_id: "GEM/2026/012", title: "Natural Gas Transport Pipeline Maintenance", status: "In Progress", bidders_count: 8, documents: [{}] },
  { id: 3, display_id: "GEM/2026/043", title: "Offshore Platform Safety Gear Procurement", status: "In Progress", bidders_count: 14, documents: [{}] },
  { id: 4, display_id: "GEM/2026/089", title: "Refinery Instrumentation & Valves", status: "Pending", bidders_count: 9, documents: [] },
  { id: 5, display_id: "GEM/2026/094", title: "Strategic Petroleum Reserve Storage Tanks", status: "Verified", bidders_count: 5, documents: [{}, {}] },
];
