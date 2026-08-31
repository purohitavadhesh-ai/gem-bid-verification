import { useState } from "react";

export default function ChecklistItem({
  label,
  status,
  note,
  evidence_doc_name,
  evidence_page,
  evidence_snippet,
  is_overridden,
  onOverride
}) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case "PASS":
        return {
          icon: "✓",
          style: "bg-status-pass-bg text-status-pass border border-status-pass/20",
          label: "PASS"
        };
      case "FAIL":
        return {
          icon: "✕",
          style: "bg-status-fail-bg text-status-fail border border-status-fail/20",
          label: "FAIL"
        };
      case "NEEDS HUMAN REVIEW":
        return {
          icon: "!",
          style: "bg-status-warn-bg text-status-warn border border-status-warn/20",
          label: "REVIEW"
        };
      case "MISSING":
      default:
        return {
          icon: "–",
          style: "bg-navy-800/10 text-navy-800 border border-border",
          label: "MISSING"
        };
    }
  };

  const badge = getStatusBadge();
  const hasEvidence = evidence_doc_name || evidence_snippet;

  return (
    <div className="border-b border-border py-3 last:border-b-0 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-navy-950">{label}</p>
            {is_overridden && (
              <span className="rounded bg-petrol-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-petrol-700">
                Officer Override
              </span>
            )}
          </div>
          {note && <p className="mt-0.5 text-xs text-navy-800/70">{note}</p>}

          {/* Expand Evidence Button */}
          {hasEvidence && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[11px] font-medium text-petrol-600 hover:underline flex items-center gap-1"
            >
              <span>{expanded ? "Hide Evidence ▴" : "View Traceable Evidence ▾"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOverride && (
            <button
              onClick={() => onOverride({ label, status, note })}
              className="text-[11px] font-medium text-navy-800/60 hover:text-navy-950 px-2 py-1 rounded border border-border hover:bg-surface"
              title="Override AI verdict"
            >
              Override
            </button>
          )}

          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge.style}`}
            aria-label={status}
            title={status}
          >
            {badge.icon}
          </span>
        </div>
      </div>

      {/* Expanded Evidence Box (Explainability) */}
      {expanded && hasEvidence && (
        <div className="mt-2.5 rounded-lg border border-border/80 bg-surface/70 p-3 text-xs text-navy-900 space-y-1.5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 text-navy-800/70">
            <span className="font-semibold text-navy-950">Source: {evidence_doc_name || "Submitted Document"}</span>
            <span className="rounded bg-white px-2 py-0.5 border border-border text-[10px] font-mono">
              Page {evidence_page || 1}
            </span>
          </div>
          {evidence_snippet && (
            <div className="rounded bg-white p-2 border border-border/60 italic text-navy-800 text-[11px] leading-relaxed">
              "{evidence_snippet}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
