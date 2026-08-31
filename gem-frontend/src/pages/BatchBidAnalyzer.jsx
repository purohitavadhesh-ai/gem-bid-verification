import { useState, useEffect } from "react";
import TopNav from "../components/TopNav";
import StatusBadge from "../components/StatusBadge";
import ComplianceRing from "../components/ComplianceRing";
import { analyzeBatchBidders } from "../data/mockData";

export default function BatchBidAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, COMPLIANT, RISK, CARTEL

  useEffect(() => {
    // Optionally load default dataset on mount, or wait for user action.
  }, []);

  async function handleLoadDataset() {
    setAnalyzing(true);
    setSummary(null);
    const res = await analyzeBatchBidders(null); // Load 50+ benchmark bidders
    setTimeout(() => {
      setSummary(res);
      setAnalyzing(false);
    }, 800); // Simulate processing time
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setSummary(null);
    const res = await analyzeBatchBidders(file);
    setSummary(res);
    setAnalyzing(false);
  }

  const filteredResults = summary?.results.filter(b => {
    if (filter === "ALL") return true;
    if (filter === "COMPLIANT") return b.status === "Compliant";
    if (filter === "RISK") return b.status.includes("Risk") || b.status.includes("Non");
    if (filter === "CARTEL") return b.cartel_flag || b.status.includes("Cartel");
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Banner Header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-petrol-900 p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-petrol-400/30 bg-petrol-500/10 px-3 py-1 text-xs font-semibold text-petrol-300 mb-2">
              <span className="h-2 w-2 rounded-full bg-petrol-400 animate-pulse" />
              High-Speed Bulk Evaluation Engine
            </div>
            <h1 className="text-2xl font-bold text-white">
              CSV/Excel Batch Bid Analyzer
            </h1>
            <p className="mt-1 text-sm text-white/70 leading-relaxed">
              Upload bidder compliance data in bulk to instantly evaluate, rank, and identify shell cartels across 50+ bidders simultaneously.
            </p>
          </div>

          <div className="flex gap-3">
            <input
              type="file"
              id="batch-csv-upload"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="batch-csv-upload"
              className="cursor-pointer rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 backdrop-blur-sm shadow-sm flex items-center gap-2"
            >
              <span>📂</span> Upload CSV/Excel
            </label>
            <button
              onClick={handleLoadDataset}
              className="rounded-xl bg-petrol-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-petrol-600 shadow-md flex items-center gap-2"
            >
              <span>⚡</span> Load 50+ SIH Benchmark Dataset
            </button>
          </div>
        </div>

        {analyzing && (
          <div className="py-20 text-center animate-pulse">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-petrol-500 border-t-transparent animate-spin mb-4" />
            <h3 className="text-lg font-bold text-navy-950">Running Parallel Rule Verification...</h3>
            <p className="text-sm text-navy-800/60 mt-1">Analyzing statutory compliance across multiple bidders simultaneously</p>
          </div>
        )}

        {summary && !analyzing && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-xl bg-card border border-border p-4 shadow-sm text-center">
                <p className="text-[10px] uppercase tracking-wider text-navy-800/50 font-bold mb-1">Total Bidders Processed</p>
                <p className="text-3xl font-black text-navy-950">{summary.total_bidders}</p>
              </div>
              <div className="rounded-xl bg-status-pass-bg border border-status-pass/30 p-4 shadow-sm text-center">
                <p className="text-[10px] uppercase tracking-wider text-status-pass font-bold mb-1">Cleared / Compliant</p>
                <p className="text-3xl font-black text-status-pass">{summary.compliant_count}</p>
              </div>
              <div className="rounded-xl bg-status-warn-bg border border-status-warn/30 p-4 shadow-sm text-center">
                <p className="text-[10px] uppercase tracking-wider text-status-warn font-bold mb-1">Moderate Risk</p>
                <p className="text-3xl font-black text-status-warn">{summary.moderate_risk_count}</p>
              </div>
              <div className="rounded-xl bg-status-fail-bg border border-status-fail/30 p-4 shadow-sm text-center">
                <p className="text-[10px] uppercase tracking-wider text-status-fail font-bold mb-1">High Risk Cartels</p>
                <p className="text-3xl font-black text-status-fail">{summary.cartel_flags_count}</p>
              </div>
              <div className="rounded-xl bg-navy-950 text-white p-4 shadow-md text-center flex flex-col justify-center border border-navy-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-petrol-500/10 pointer-events-none" />
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1 z-10">L1 Lowest Compliant Quote</p>
                <p className="text-xl font-bold text-petrol-400 z-10">{summary.lowest_compliant_quote_l1}</p>
                <p className="text-[10px] text-white/70 truncate px-2 mt-0.5 z-10">{summary.l1_bidder_name}</p>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-bold text-navy-950">Global Batch Leaderboard &amp; Compliance Roster</h2>
                
                <div className="flex gap-2 bg-white rounded-lg p-1 border border-border shadow-sm">
                  {["ALL", "COMPLIANT", "RISK", "CARTEL"].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                        filter === f ? "bg-navy-950 text-white shadow" : "text-navy-800/60 hover:text-navy-950 hover:bg-surface"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface z-10 shadow-sm border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold">Rank</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold">Bidder Name</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold text-right">Quoted Price</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold text-center">Score</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold">Compliance Status</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold">Statutory Signals (PAN/GST/EPF)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-navy-800/60 font-bold">Exceptions / Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredResults.map((b) => (
                      <tr key={b.bidder_id} className={`hover:bg-surface transition-colors ${b.cartel_flag ? "bg-status-fail-bg/30" : ""}`}>
                        <td className="px-4 py-3.5 align-middle">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${b.rank === 1 && b.status === "Compliant" ? "bg-petrol-100 text-petrol-700 ring-2 ring-petrol-500/50" : "bg-card text-navy-800/60 border border-border"}`}>
                            {b.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <p className="text-xs font-bold text-navy-950">{b.company_name}</p>
                          <p className="text-[10px] text-navy-800/50 font-mono mt-0.5">{b.bidder_id}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <p className="text-xs font-bold text-navy-950 font-mono">{b.quote_formatted}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center">
                          <span className={`text-xs font-black ${b.compliance_score >= 85 ? 'text-status-pass' : (b.compliance_score >= 60 ? 'text-status-warn' : 'text-status-fail')}`}>
                            {b.compliance_score}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${b.pan_verified ? 'bg-status-pass' : 'bg-status-fail'}`} title="PAN" />
                            <span className={`w-2 h-2 rounded-full ${b.gstin_active ? 'bg-status-pass' : 'bg-status-fail'}`} title="GSTIN" />
                            <span className={`w-2 h-2 rounded-full ${b.epf_valid ? 'bg-status-pass' : 'bg-status-fail'}`} title="EPF" />
                            <span className={`w-2 h-2 rounded-full ${b.oem_authorized ? 'bg-status-pass' : 'bg-status-fail'}`} title="OEM" />
                            <span className="text-[10px] font-semibold text-navy-800/40 ml-1 font-mono">T/O: {b.turnover_cr}Cr</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle max-w-xs">
                          {b.disqualification_reason ? (
                            <p className="text-[10px] text-status-fail font-medium leading-snug truncate" title={b.disqualification_reason}>
                              ⚠️ {b.disqualification_reason}
                            </p>
                          ) : (
                            <span className="text-[10px] text-navy-800/30 font-medium">No alerts</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredResults.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-navy-800/50">
                          No bidders found matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button className="rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-bold text-navy-950 shadow-sm transition hover:bg-surface flex items-center gap-2">
                <span>⬇️</span> Export Audit CSV Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
