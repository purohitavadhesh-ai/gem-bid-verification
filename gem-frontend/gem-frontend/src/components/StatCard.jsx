export default function StatCard({ label, value, subtext, accent = "petrol" }) {
  const accentClass = {
    petrol: "text-petrol-600",
    fail: "text-status-fail",
    warn: "text-status-warn",
    pass: "text-status-pass",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-navy-800/70">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accentClass}`}>{value}</p>
      <p className="mt-1 text-xs text-navy-800/60">{subtext}</p>
    </div>
  );
}
