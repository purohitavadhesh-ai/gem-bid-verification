export default function ComplianceRing({ percent, size = 128, strokeWidth }) {
  const stroke = strokeWidth || (size < 60 ? 4 : 10);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 85 ? "var(--color-status-pass)" : percent >= 60 ? "var(--color-status-warn)" : "var(--color-status-fail)";

  const isSmall = size < 80;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e6ec" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${isSmall ? 'text-[11px]' : 'text-2xl'} font-bold`} style={{ color }}>
          {percent}%
        </span>
        {!isSmall && (
          <span className="text-[10px] uppercase tracking-wide text-navy-800/60 mt-0.5">Compliance</span>
        )}
      </div>
    </div>
  );
}
