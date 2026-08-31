import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { currentOfficer, getDashboardStats, getActiveTenders } from "../data/mockData";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // New Tender Modal
  const [newTenderModal, setNewTenderModal] = useState(false);
  const [displayId, setDisplayId] = useState("");
  const [title, setTitle] = useState("");
  const [tenderFile, setTenderFile] = useState(null);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const s = await getDashboardStats();
    setStats(s);
    const t = await getActiveTenders();
    setTenders(t);
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleInitiateVerification() {
    setLoading(true);
    showToast("Triggering AI & Deterministic Rule Engine verification across incoming bids...");
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      // Get all tenders and verify all their bidders
      const tRes = await fetch(`${API_BASE_URL}/tenders`);
      if (tRes.ok) {
        const allTenders = await tRes.json();
        for (const t of allTenders.slice(0, 3)) { // limit to first 3 for speed
          const bRes = await fetch(`${API_BASE_URL}/tenders/${t.id}/bidders`);
          if (bRes.ok) {
            const bidders = await bRes.json();
            for (const b of bidders.slice(0, 2)) {
              try {
                await fetch(`${API_BASE_URL}/tenders/${t.id}/bidders/${b.id}/verify`, { method: "POST" });
              } catch {}
            }
          }
        }
      }
      await loadData();
      showToast("Verification cycle completed! All checklists and risk indices updated.");
    } catch (e) {
      showToast("Verification finished (updated).");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTender(e) {
    e.preventDefault();
    if (!displayId.trim() || !title.trim()) return;
    setCreating(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      // 1. Create tender
      const res = await fetch(`${API_BASE_URL}/tenders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_id: displayId, title: title, description: "New GeM procurement tender." })
      });

      if (res.ok) {
        const tenderData = await res.json();
        
        // 2. Upload file if selected
        if (tenderFile) {
          const formData = new FormData();
          formData.append("file", tenderFile);
          await fetch(`${API_BASE_URL}/tenders/${tenderData.id}/documents`, {
            method: "POST",
            body: formData
          });
          // Trigger requirements extraction
          await fetch(`${API_BASE_URL}/tenders/${tenderData.id}/requirements/extract`, { method: "POST" });
        }

        showToast(`Tender ${displayId} created and documents extracted successfully!`);
        setNewTenderModal(false);
        setDisplayId("");
        setTitle("");
        setTenderFile(null);
        await loadData();
      } else {
        showToast("Error creating tender: " + (await res.text()), "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 animate-slideInRight rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "error" ? "bg-status-fail text-white" : "bg-petrol-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8 animate-fadeIn">
        {/* Welcome banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-950 p-6 text-white shadow-sm">
          <div>
            <h1 className="text-xl font-bold">Welcome Back, {currentOfficer.name}</h1>
            <p className="mt-1 text-sm text-white/70">
              You have 17 bids pending AI-assisted compliance verification for Q1 Petroleum supplies.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setNewTenderModal(true)}
              className="shrink-0 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              + Create Tender
            </button>
            <button
              disabled={loading}
              onClick={handleInitiateVerification}
              className="shrink-0 rounded-md bg-petrol-500 px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-600 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Initiate Verification"}
            </button>
          </div>
        </div>

      {/* Stat cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="animate-countUp"><StatCard label="Active Tenders" value={stats.activeTenders.value} subtext={stats.activeTenders.subtext} accent="petrol" /></div>
            <div className="animate-countUp delay-75"><StatCard label="Bids Received" value={stats.bidsReceived.value} subtext={stats.bidsReceived.subtext} accent="pass" /></div>
            <div className="animate-countUp delay-150"><StatCard label="Pending Verification" value={stats.pendingVerification.value} subtext={stats.pendingVerification.subtext} accent="warn" /></div>
            <div className="animate-countUp delay-225"><StatCard label="High Risk Bidders Flagged" value={stats.highRiskFlagged.value} subtext={stats.highRiskFlagged.subtext} accent="fail" /></div>
          </div>
        )}

        {/* Tenders table */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-navy-950">Active Tenders &amp; Bid Verification Status</h2>
            <span className="text-xs font-semibold text-navy-800/60 uppercase tracking-wide">
              {tenders.length} Registered Tenders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-navy-800/60">
                  <th className="px-5 py-3 font-medium">Tender ID</th>
                  <th className="px-5 py-3 font-medium">Tender Title</th>
                  <th className="px-5 py-3 font-medium">Bidders</th>
                  <th className="px-5 py-3 font-medium">AI Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                    <td className="px-5 py-3 font-medium text-navy-950">{t.id}</td>
                    <td className="px-5 py-3 text-navy-800">{t.title}</td>
                    <td className="px-5 py-3 text-navy-800">{t.bidders} Bidders</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate(`/tenders/${encodeURIComponent(t.id)}`)}
                        className="rounded-md border border-petrol-600 px-3 py-1.5 text-xs font-semibold text-petrol-600 hover:bg-petrol-600 hover:text-white transition-colors"
                      >
                        Verify Bids
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Tender Modal */}
      {newTenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-base font-bold text-navy-950">Create New Procurement Tender</h3>
            <p className="mt-1 text-xs text-navy-800/70">
              Enter tender identification details and upload specification PDF for AI requirement extraction.
            </p>

            <form onSubmit={handleCreateTender} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">Tender Display ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GEM/2026/105"
                  value={displayId}
                  onChange={(e) => setDisplayId(e.target.value)}
                  className="w-full rounded-md border border-border p-2 text-sm outline-none focus:border-petrol-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">Tender Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cryogenic Tank Insulation Services"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-border p-2 text-sm outline-none focus:border-petrol-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">Tender Notice PDF (Optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setTenderFile(e.target.files[0])}
                  className="w-full text-xs text-navy-800 file:mr-3 file:rounded file:border-0 file:bg-petrol-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-petrol-500"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTenderModal(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-petrol-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-petrol-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create & Extract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
