interface NearstreamMarkProps {
  size?: number;
  className?: string;
}

const POINTS = [
  { cx: 22, cy: 8, r: 1.8, opacity: 0.3 },
  { cx: 28, cy: 16, r: 2.8, opacity: 0.5 },
  { cx: 38, cy: 22, r: 2.0, opacity: 0.4 },
  { cx: 50, cy: 28, r: 3.5, opacity: 0.9 },
  { cx: 58, cy: 38, r: 2.2, opacity: 0.6 },
  { cx: 62, cy: 48, r: 3.0, opacity: 0.8 },
  { cx: 58, cy: 58, r: 2.5, opacity: 0.7 },
  { cx: 50, cy: 66, r: 3.2, opacity: 1.0 },
  { cx: 42, cy: 74, r: 2.0, opacity: 0.5 },
  { cx: 38, cy: 82, r: 2.8, opacity: 0.6 },
  { cx: 40, cy: 90, r: 1.5, opacity: 0.3 },
  // scattered satellites
  { cx: 70, cy: 32, r: 1.2, opacity: 0.2 },
  { cx: 32, cy: 44, r: 1.0, opacity: 0.15 },
  { cx: 72, cy: 60, r: 1.4, opacity: 0.2 },
  { cx: 28, cy: 70, r: 1.1, opacity: 0.15 },
];

export function NearstreamMark({ size = 24, className }: NearstreamMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      {POINTS.map((p, i) => (
        <g key={i}>
          {p.r > 2.5 && (
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.r * 3}
              fillOpacity={p.opacity * 0.06}
            />
          )}
          <circle cx={p.cx} cy={p.cy} r={p.r} fillOpacity={p.opacity} />
        </g>
      ))}
    </svg>
  );
}

interface NearstreamLockupProps {
  size?: number;
  className?: string;
}

export function NearstreamLockup({
  size = 24,
  className,
}: NearstreamLockupProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <NearstreamMark size={size} />
      <span
        className="font-mono uppercase tracking-[0.2em]"
        style={{ fontSize: size * 0.35 }}
      >
        Nearstream
      </span>
    </div>
  );
}
