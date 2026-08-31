import { useEffect, useState } from "react";
import TopNav from "../components/TopNav";
import { getAuditLogs, downloadComplianceReport } from "../data/mockData";

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [actionType, setActionType] = useState("All Actions");
  const [officer, setOfficer] = useState("All Users");

  useEffect(() => {
    // GET /audit-logs?dateRange=&actionType=&officer=
    getAuditLogs({ dateRange, actionType, officer }).then(setLogs);
  }, [dateRange, actionType, officer]);

  function clearFilters() {
    setDateRange("Last 7 Days");
    setActionType("All Actions");
    setOfficer("All Users");
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy-950">Regulatory Compliance &amp; Bid Action Logs</h1>
            <p className="mt-1 text-sm text-navy-800/70">Immutable Audit Trail protected by NIC Security</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <FilterSelect label="Date Range" value={dateRange} onChange={setDateRange} options={["Last 7 Days", "Last 30 Days", "This Quarter"]} />
          <FilterSelect label="Action Type" value={actionType} onChange={setActionType} options={["All Actions", "Compliance Approved", "Flagged Risk Triggered", "Uploaded Bid Files Scanned"]} />
          <FilterSelect label="Officer" value={officer} onChange={setOfficer} options={["All Users", "Rajesh Kumar", "Ankita Roy", "AI-System"]} />
          <button
            onClick={clearFilters}
            className="ml-auto rounded-md border border-border px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-surface"
          >
            Clear Filters
          </button>
        </div>

        {/* Audit log table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-navy-800/60">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Tender ID</th>
                <th className="px-5 py-3 font-medium">Performed By</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface">
                  <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-navy-800/70">{log.timestamp}</td>
                  <td className="px-5 py-3 font-medium text-navy-950">{log.action}</td>
                  <td className="px-5 py-3 text-navy-800">{log.tenderId}</td>
                  <td className="px-5 py-3 text-navy-800">{log.performedBy}</td>
                  <td className="px-5 py-3 text-navy-800/70">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report generation panel */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-navy-950">Generate Audit Reports</h2>
          <p className="mt-1 text-sm text-navy-800/70">
            Compile comprehensive compliance documentation for board evaluation and vigilance audit clearances.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-800/60">Select Report Template</p>
              <select className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-petrol-500">
                <option>Detailed Bid Evaluation Report (PDF)</option>
              </select>
            </div>
            <button
              onClick={() => downloadComplianceReport("bid-2")}
              className="mt-5 rounded-md bg-petrol-600 px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-500"
            >
              Export Official Audit PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-navy-800/50">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
