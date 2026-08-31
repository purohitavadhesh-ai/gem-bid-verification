import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";
import ComplianceRing from "../components/ComplianceRing";
import ChecklistItem from "../components/ChecklistItem";
import {
  getTenderById,
  getBiddersForTender,
  getBidderResults,
  submitBidderDecision,
  downloadComplianceReport
} from "../data/mockData";

export default function BidderAnalysis() {
  const { tenderId } = useParams();
  const navigate = useNavigate();

  const [tender, setTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [selectedBidderId, setSelectedBidderId] = useState(null);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Override Modal state
  const [overrideItem, setOverrideItem] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("PASS");
  const [overrideComment, setOverrideComment] = useState("");

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getTenderById(tenderId).then(setTender);
    getBiddersForTender(tenderId).then((list) => {
      setBidders(list);
      const defaultBidder = list.find((b) => b.status === "Moderate") ?? list[0];
      if (defaultBidder) setSelectedBidderId(defaultBidder.id);
    });
  }, [tenderId]);

  useEffect(() => {
    if (selectedBidderId) {
      getBidderResults(selectedBidderId, tenderId).then(setResults);
    }
  }, [selectedBidderId, tenderId]);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDecision(decision) {
    setSubmitting(true);
    try {
      await submitBidderDecision(selectedBidderId, decision, tenderId);
      const labels = {
        approve: "Approved",
        flag_reject: "Rejected",
        request_correction: "Correction Requested"
      };
      showToast(`Decision "${labels[decision]}" recorded in audit trail successfully!`);
      // Refresh results
      const updated = await getBidderResults(selectedBidderId, tenderId);
      setResults(updated);
    } catch (e) {
      showToast("Error recording decision: " + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenOverride(item) {
    setOverrideItem(item);
    setOverrideStatus(item.status === "PASS" ? "FAIL" : "PASS");
    setOverrideComment("");
  }

  async function handleSaveOverride() {
    if (!overrideComment.trim()) {
      alert("Please provide a mandatory justification comment for the audit trail.");
      return;
    }
    
    // Update local results state with override
    const updateList = (list) =>
      list.map((it) =>
        it.label === overrideItem.label
          ? { ...it, status: overrideStatus, note: overrideComment, is_overridden: true }
          : it
      );

    setResults((prev) => ({
      ...prev,
      mandatoryDocuments: updateList(prev.mandatoryDocuments),
      financialTechnical: updateList(prev.financialTechnical),
    }));

    showToast(`Override saved for "${overrideItem.label}" as ${overrideStatus}!`);
    setOverrideItem(null);
  }

  async function handleUploadDoc(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE_URL}/bidders/${selectedBidderId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("Document uploaded and processed with PyMuPDF/OCR!");
        setUploadModalOpen(false);
        setUploadFile(null);
        // Refresh results
        const updated = await getBidderResults(selectedBidderId, tenderId);
        setResults(updated);
      } else {
        showToast("Upload failed: " + (await res.text()), "error");
      }
    } catch (err) {
      showToast("Upload error: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-800/60">
            Tender Details <span className="mx-1">›</span> Bidder Analysis
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-white"
            >
              Back to List
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="rounded-md border border-petrol-600 bg-petrol-50 px-3 py-1.5 text-xs font-semibold text-petrol-700 hover:bg-petrol-100"
            >
              + Upload Bidder PDF
            </button>
            <button
              onClick={() => downloadComplianceReport(selectedBidderId, tenderId)}
              className="rounded-md bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
            >
              Export Official Report (PDF)
            </button>
          </div>
        </div>

        <h1 className="mb-6 text-xl font-bold text-navy-950">
          {tenderId}: {tender?.title}
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar: bidder list */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Submitted Bidders ({bidders.length})
            </p>
            <div className="space-y-2">
              {bidders.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBidderId(b.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedBidderId === b.id
                      ? "border-petrol-500 bg-petrol-500/5"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-950">{b.name}</span>
                    <span className="text-sm font-bold text-navy-950">{b.score}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-navy-800/50">Submitted {b.submittedAgo}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main detail panel */}
          {results && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
                <div className="flex items-center gap-5">
                  <ComplianceRing percent={results.score} />
                  <div>
                    <h2 className="text-lg font-bold text-navy-950">{results.name}</h2>
                    <div className="mt-1">
                      <StatusBadge status={`${results.riskLevel} Risk`.replace("Non-Compliant Risk", "Non-Compliant")} />
                      <span className="ml-2 text-xs text-navy-800/50">Rule Engine Verified</span>
                    </div>
                    <p className="mt-2 max-w-md text-sm text-navy-800/70">{results.subtitle}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-navy-800/70">
                  <p>
                    GeM Bid Ref: <span className="font-medium text-navy-950">{results.gemBidRef}</span>
                  </p>
                  <p>
                    Bid Value: <span className="font-medium text-navy-950">{results.bidValue}</span>
                  </p>
                </div>
              </div>

              {/* Flagged Contradictions Alert Box (FR-11) */}
              {results.contradictions && results.contradictions.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-950">
                  <div className="flex items-center gap-2 font-bold text-red-700 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">!</span>
                    Detected Intra-Bidder Document Contradiction
                  </div>
                  {results.contradictions.map((c, idx) => (
                    <div key={idx} className="space-y-1.5 text-xs text-red-900">
                      <p className="font-medium">{c.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div className="rounded bg-white p-2 border border-red-200">
                          <span className="font-semibold text-red-800">Source A ({c.source_doc_a}, p.{c.source_page_a}):</span>
                          <p className="font-mono mt-0.5 text-navy-950">{c.value_a}</p>
                        </div>
                        <div className="rounded bg-white p-2 border border-red-200">
                          <span className="font-semibold text-red-800">Source B ({c.source_doc_b}, p.{c.source_page_b}):</span>
                          <p className="font-mono mt-0.5 text-navy-950">{c.value_b}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklists */}
              <div className="grid grid-cols-1 gap-8 py-2 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy-950">Mandatory Documents</h3>
                  <div>
                    {results.mandatoryDocuments.map((item) => (
                      <ChecklistItem
                        key={item.label}
                        {...item}
                        onOverride={handleOpenOverride}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy-950">Financial &amp; Technical Specs</h3>
                  <div>
                    {results.financialTechnical.map((item) => (
                      <ChecklistItem
                        key={item.label}
                        {...item}
                        onOverride={handleOpenOverride}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="rounded-lg bg-status-warn-bg px-4 py-3 text-sm text-status-warn">
                <span className="font-semibold">AI Verification Insight: </span>
                {results.aiSummary}
              </div>

              {/* Decision Action Buttons */}
              <div className="mt-5 flex flex-wrap justify-end gap-3 pt-2">
                <button
                  disabled={submitting}
                  onClick={() => handleDecision("flag_reject")}
                  className="rounded-md border border-status-fail px-4 py-2 text-sm font-semibold text-status-fail hover:bg-status-fail-bg disabled:opacity-50"
                >
                  Flag &amp; Reject
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleDecision("request_correction")}
                  className="rounded-md border border-status-warn px-4 py-2 text-sm font-semibold text-status-warn hover:bg-status-warn-bg disabled:opacity-50"
                >
                  Request Correction
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleDecision("approve")}
                  className="rounded-md bg-status-pass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 rounded-md border border-border bg-white/60 px-4 py-3 text-xs text-navy-800/60">
          Final compliance decisions are made solely by the procurement officer. AI-generated verdicts are advisory
          and require human confirmation before any bid is approved or rejected.
        </p>
      </main>

      {/* Human Override Modal (FR-14) */}
      {overrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-base font-bold text-navy-950">Override Verdict</h3>
            <p className="mt-1 text-xs text-navy-800/70">
              Clause: <span className="font-semibold text-navy-950">{overrideItem.label}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">New Verdict Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full rounded-md border border-border p-2 text-sm outline-none focus:border-petrol-500"
                >
                  <option value="PASS">PASS (Compliant)</option>
                  <option value="FAIL">FAIL (Non-Compliant)</option>
                  <option value="NEEDS HUMAN REVIEW">NEEDS HUMAN REVIEW</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-950 mb-1">
                  Mandatory Officer Justification Comment *
                </label>
                <textarea
                  rows={3}
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  placeholder="State the statutory / legal reason for this override..."
                  className="w-full rounded-md border border-border p-2 text-sm outline-none focus:border-petrol-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOverrideItem(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="rounded-md bg-petrol-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-petrol-500"
              >
                Save Override to Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Bidder Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-base font-bold text-navy-950">Upload Bidder PDF Document</h3>
            <p className="mt-1 text-xs text-navy-800/70">
              Upload certificates, PAN/GST proofs, or balance sheets for PyMuPDF &amp; OCR text extraction.
            </p>

            <form onSubmit={handleUploadDoc} className="mt-4 space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-petrol-500">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-navy-800 file:mr-3 file:rounded file:border-0 file:bg-petrol-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-petrol-500"
                />
                {uploadFile && <p className="mt-2 text-xs font-medium text-petrol-700">{uploadFile.name}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="rounded-md bg-petrol-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-petrol-500 disabled:opacity-50"
                >
                  {uploading ? "Extracting..." : "Upload & Extract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
