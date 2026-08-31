import { useState, useEffect } from "react";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";
import ComplianceRing from "../components/ComplianceRing";
import VendorCurePortalModal from "../components/VendorCurePortalModal";
import { generateCureNotice, simulateWhatIf } from "../data/mockData";

export default function RemediationCopilot() {
  const [selectedBidder, setSelectedBidder] = useState("bid-2");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [cureNotice, setCureNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copiedType, setCopiedType] = useState(null);
  const [portalOpen, setPortalOpen] = useState(false);

  // What-If Simulation state
  const [currentScore, setCurrentScore] = useState(78);
  const [remedyChecklist, setRemedyChecklist] = useState({
    "EPF/ESIC Registration": true,
    "OEM Authorization Slip": true,
    "Bid Solvency Certificate": false,
  });
  const [simulationResult, setSimulationResult] = useState(null);

  const bidderDetails = {
    "bid-2": {
      name: "Western Fuel Logistics Ltd",
      tenderId: "GEM/2026/001",
      tenderTitle: "High-Capacity Lubricant Supplies - Mumbai Port",
      bidRef: "GEM-BID-9923212",
      bidValue: "Rs. 1,42,50,000",
      deficiencies: [
        { label: "EPF/ESIC Registration", note: "Expired Dec 2025", curable: true, points: 12 },
        { label: "OEM Authorization Slip", note: "Missing Manufacturer Stamp / Seal", curable: true, points: 14 },
      ]
    },
    "bid-3": {
      name: "Apex Valves & Pipes Pvt Ltd",
      tenderId: "GEM/2026/001",
      tenderTitle: "High-Capacity Lubricant Supplies - Mumbai Port",
      bidRef: "GEM-BID-8812903",
      bidValue: "Rs. 1,12,00000",
      deficiencies: [
        { label: "GSTIN Active Status", note: "Inactive / Suspended by GSTN Ward", curable: false, points: 15 },
        { label: "MCA Shell Cartel Link", note: "Shared director with rival bidder Zenith Piping", curable: false, points: 30 },
      ]
    }
  };

  const activeBidder = bidderDetails[selectedBidder] || bidderDetails["bid-2"];

  useEffect(() => {
    handleRunSimulation();
    handleGenerateNotice();
  }, [selectedBidder, deadlineHours]);

  async function handleRunSimulation() {
    const selectedItems = Object.entries(remedyChecklist)
      .filter(([_, active]) => active)
      .map(([k]) => k);

    const res = await simulateWhatIf({
      bidder_id: selectedBidder,
      current_score: currentScore,
      remedied_items: selectedItems
    });
    setSimulationResult(res);
  }

  async function handleGenerateNotice() {
    setGenerating(true);
    const payload = {
      bidder_name: activeBidder.name,
      tender_id: activeBidder.tenderId,
      tender_title: activeBidder.tenderTitle,
      gem_bid_ref: activeBidder.bidRef,
      deadline_hours: deadlineHours,
      deficiencies: activeBidder.deficiencies
    };
    const res = await generateCureNotice(payload);
    setCureNotice(res);
    setGenerating(false);
  }

  function handleCopy(text, type) {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 3000);
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-petrol-900 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-petrol-400/30 bg-petrol-500/10 px-3 py-1 text-xs font-semibold text-petrol-300 mb-2">
                <span className="h-2 w-2 rounded-full bg-petrol-400 animate-pulse" />
                Remediation Engine • GeM GTC Cl. 14.2 Compliant
              </div>
              <h1 className="text-2xl font-bold text-white">
                AI "What-If" Counter-Negotiation &amp; Vendor Correction Copilot
              </h1>
              <p className="mt-1 text-sm text-white/70 max-w-2xl">
                Prevent unnecessary bid disqualifications. Interactively simulate score recoveries, draft legally binding Cure Notices, and dispatch 24/48h tokenized correction links.
              </p>
            </div>

            {/* Quick Bidder Selector */}
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <label className="text-[11px] uppercase tracking-wider text-white/60 block font-semibold mb-1">
                Target Bidder in Review
              </label>
              <select
                value={selectedBidder}
                onChange={(e) => {
                  setSelectedBidder(e.target.value);
                  setCurrentScore(e.target.value === "bid-2" ? 78 : 42);
                }}
                className="rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white border border-white/20 outline-none focus:border-petrol-400"
              >
                <option value="bid-2">Western Fuel Logistics (78% - Moderate Risk)</option>
                <option value="bid-3">Apex Valves &amp; Pipes (42% - High Risk / Shell)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: What-If Copilot Simulation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Simulation Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-950">
                    What-If Recovery Simulator
                  </h2>
                  <p className="text-xs text-navy-800/60 mt-0.5">
                    Toggle curable non-compliance items to project score outcomes.
                  </p>
                </div>
                <StatusBadge status={activeBidder.name.includes("Western") ? "Moderate" : "Non-Compliant"} />
              </div>

              {/* Dynamic Score Comparison Display */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface p-4 border border-border">
                <div className="text-center">
                  <span className="text-[11px] uppercase tracking-wider text-navy-800/50 block font-semibold">
                    Current Score
                  </span>
                  <div className="mt-1 flex justify-center">
                    <ComplianceRing percent={currentScore} />
                  </div>
                  <span className="text-xs font-medium text-navy-800/70 mt-1 block">
                    Pre-Remediation
                  </span>
                </div>

                <div className="text-center">
                  <span className="text-[11px] uppercase tracking-wider text-petrol-600 block font-semibold">
                    Projected Score
                  </span>
                  <div className="mt-1 flex justify-center">
                    <ComplianceRing percent={simulationResult?.simulated_score || currentScore} />
                  </div>
                  <span className="text-xs font-bold text-status-pass mt-1 block">
                    +{simulationResult?.score_delta || 0}% Gain Potential
                  </span>
                </div>
              </div>

              {/* Curable Remediation Checklist */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800/70 mb-3">
                  Curable Statutory Deficiencies Checklist
                </h3>
                <div className="space-y-3">
                  {Object.entries(remedyChecklist).map(([item, checked]) => (
                    <label
                      key={item}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                        checked
                          ? "border-petrol-500/60 bg-petrol-500/5 shadow-sm"
                          : "border-border bg-card/60 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const updated = { ...remedyChecklist, [item]: e.target.checked };
                          setRemedyChecklist(updated);
                          setTimeout(handleRunSimulation, 50);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-border text-petrol-600 focus:ring-petrol-500"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-navy-950">
                          <span>{item}</span>
                          <span className="rounded bg-petrol-100 px-1.5 py-0.5 text-[10px] text-petrol-700 font-bold">
                            +12 to +14 pts
                          </span>
                        </div>
                        <p className="text-navy-800/60 mt-0.5 text-[11px]">
                          Grant 48h cure notice for digitally signed active certificate.
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recommendation Insight Box */}
              <div className="rounded-xl border border-petrol-500/30 bg-petrol-500/10 p-4 text-xs text-navy-950">
                <span className="font-bold text-petrol-800 flex items-center gap-1.5 mb-1">
                  💡 AI Remediation Assessment:
                </span>
                <p className="text-navy-800/80 leading-relaxed">
                  {simulationResult?.recommendation || "Analyzing optimal remediation pathway..."}
                </p>
              </div>

              {/* Quick Launch Portal Button */}
              <button
                type="button"
                onClick={() => setPortalOpen(true)}
                className="w-full rounded-xl bg-navy-950 py-3 text-xs font-bold text-white hover:bg-navy-800 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              >
                <span>🖥️</span> Open Vendor Remediation Portal Simulator
              </button>
            </div>
          </div>

          {/* Right Column: AI Cure Notice Generator & Dispatcher (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-950">
                    GeM Statutory Cure Notice &amp; Notification Dispatcher
                  </h2>
                  <p className="text-xs text-navy-800/60 mt-0.5">
                    Automated legal directive drafting under GeM GTC Clause 14.2
                  </p>
                </div>

                {/* Deadline Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-navy-800/60 font-medium">Cure Window:</span>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(Number(e.target.value))}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 font-bold text-navy-950 outline-none focus:border-petrol-500"
                  >
                    <option value={24}>24 Hours (Fast Track)</option>
                    <option value={48}>48 Hours (Standard)</option>
                    <option value={72}>72 Hours (Extended)</option>
                  </select>
                </div>
              </div>

              {/* Cure Notice Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-800/70">
                    Official Notice Document (Drafted by AI)
                  </span>
                  <button
                    onClick={() => handleCopy(cureNotice?.legal_cure_notice_body, "notice")}
                    className="text-xs font-semibold text-petrol-600 hover:text-petrol-700 flex items-center gap-1"
                  >
                    {copiedType === "notice" ? "✓ Copied Notice!" : "📋 Copy Notice Text"}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={10}
                  value={generating ? "AI Drafting Legal Notice..." : cureNotice?.legal_cure_notice_body || ""}
                  className="w-full rounded-xl border border-border bg-surface p-3.5 font-mono text-[11px] text-navy-950 leading-relaxed outline-none shadow-inner resize-none"
                />
              </div>

              {/* Multi-Channel Notification Simulator (Email & SMS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Email Draft Box */}
                <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                      📧 Official Email Alert
                    </span>
                    <button
                      onClick={() => handleCopy(cureNotice?.email_draft, "email")}
                      className="text-[10px] font-semibold text-petrol-600 hover:underline"
                    >
                      {copiedType === "email" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border text-[11px] text-navy-800/80 font-mono whitespace-pre-line max-h-32 overflow-y-auto">
                    {cureNotice?.email_draft}
                  </div>
                </div>

                {/* SMS Draft Box */}
                <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                      📱 SMS Instant Push
                    </span>
                    <button
                      onClick={() => handleCopy(cureNotice?.sms_draft, "sms")}
                      className="text-[10px] font-semibold text-petrol-600 hover:underline"
                    >
                      {copiedType === "sms" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border text-[11px] text-navy-800/80 font-mono whitespace-pre-line max-h-32 overflow-y-auto">
                    {cureNotice?.sms_draft}
                  </div>
                </div>
              </div>

              {/* Encrypted Tokenized Link Simulator */}
              <div className="rounded-xl border border-petrol-500/30 bg-petrol-500/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-petrol-700 block font-bold">
                    Encrypted Vendor Access Token URL
                  </span>
                  <span className="font-mono text-[11px] text-navy-950 select-all">
                    {cureNotice?.tokenized_upload_url || "https://gem.gov.in/remediation/portal?token=..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPortalOpen(true)}
                  className="rounded-lg bg-petrol-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-petrol-700 shadow-sm"
                >
                  Test Vendor View ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Vendor Portal Simulator Modal */}
      <VendorCurePortalModal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
        noticeData={cureNotice}
        bidderName={activeBidder.name}
        onSuccessRemediated={() => {
          setCurrentScore(92);
          handleRunSimulation();
        }}
      />
    </div>
  );
}
