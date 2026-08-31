const STYLES = {
  Verified: "bg-status-pass-bg text-status-pass",
  "In Progress": "bg-status-warn-bg text-status-warn",
  Pending: "bg-navy-800/10 text-navy-800",
  Compliant: "bg-status-pass-bg text-status-pass",
  Moderate: "bg-status-warn-bg text-status-warn",
  "Non-Compliant": "bg-status-fail-bg text-status-fail",
  PASS: "bg-status-pass-bg text-status-pass",
  FAIL: "bg-status-fail-bg text-status-fail",
  MISSING: "bg-navy-800/10 text-navy-800",
  "NEEDS HUMAN REVIEW": "bg-status-review-bg text-status-review",
  "Critical Risk": "bg-status-fail-bg text-status-fail",
  "Moderate Risk": "bg-status-warn-bg text-status-warn",
  critical: "bg-status-fail-bg text-status-fail",
  low: "bg-status-pass-bg text-status-pass",
  gaps: "bg-status-warn-bg text-status-warn",
  verified: "bg-status-pass-bg text-status-pass",
};

const LABELS = {
  low: "Low Risk",
  critical: "Critical Issues",
  gaps: "Gaps Found",
  verified: "Verified Secure",
};

export default function StatusBadge({ status, className = "" }) {
  const style = STYLES[status] || "bg-navy-800/10 text-navy-800";
  const label = LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${style} ${className}`}
    >
      {label}
    </span>
  );
}
