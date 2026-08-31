import { useEffect, useState } from "react";
import TopNav from "../components/TopNav";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { getThreatMatrix, getAIInsights, getFlaggedBidders } from "../data/mockData";

export default function SecurityInsights() {
  const [matrix, setMatrix] = useState(null);
  const [insights, setInsights] = useState(null);
  const [flagged, setFlagged] = useState([]);

  useEffect(() => {
    getThreatMatrix().then(setMatrix); // GET /security/threat-matrix
    getAIInsights().then(setInsights); // GET /security/insights
    getFlaggedBidders().then(setFlagged); // GET /security/flagged-bidders
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-xl font-bold text-navy-950">Platform Security &amp; AI Intelligence Dashboard</h1>
        <p className="mt-1 text-sm text-navy-800/70">
          Deep learning scans active across all incoming bids targeting Shell Entities, Document Alterations, and
          Credibility Gaps.
        </p>

        {matrix && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Critical Shell Detections" value={matrix.stats.criticalShellDetections} subtext="Flagged this cycle" accent="fail" />
              <StatCard label="Minor Gaps Triggered" value={matrix.stats.minorGapsTriggered} subtext="Requires follow-up" accent="warn" />
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-base font-semibold text-navy-950">AI Threat Category Matrix</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {matrix.categories.map((c) => (
                  <div key={c.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold text-navy-950">{c.title}</p>
                    <p className="mt-1 text-xs text-navy-800/60">{c.detail}</p>
                    <div className="mt-3">
                      <StatusBadge status={c.severity} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {insights && (
          <div className="mt-8 rounded-xl border border-border bg-navy-950 p-5 text-white">
            <h2 className="mb-2 text-sm font-semibold text-petrol-500">AI Verification Insights</h2>
            <p className="text-sm text-white/80">{insights.text}</p>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-navy-950">Flagged High &amp; Moderate Risk Bidders</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
            {flagged.map((b) => (
              <div key={b.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-navy-950">
                    {b.name} <span className="ml-1 text-navy-800/60">{b.score}% Score</span>
                  </p>
                  <p className="mt-0.5 text-xs text-navy-800/60">{b.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.severity} />
                  <button className="text-sm font-medium text-petrol-600 hover:underline">Audit Trail</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
