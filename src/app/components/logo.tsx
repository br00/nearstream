"use client";

/**
 * Nearstream logo mark — a flowing stream of points.
 * Works at any size. The points suggest movement and connection
 * without being literal. Like a small constellation drifting.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  // Points along a gentle S-curve, normalized to 0-100 viewBox
  const points = [
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
    // Scattered satellite points
    { cx: 70, cy: 32, r: 1.2, opacity: 0.2 },
    { cx: 32, cy: 44, r: 1.0, opacity: 0.15 },
    { cx: 72, cy: 60, r: 1.4, opacity: 0.2 },
    { cx: 28, cy: 70, r: 1.1, opacity: 0.15 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {points.map((p, i) => (
        <g key={i}>
          {/* Glow halo for larger points */}
          {p.r > 2.5 && (
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.r * 3}
              fill={`rgba(255, 255, 255, ${p.opacity * 0.06})`}
            />
          )}
          <circle
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={`rgba(255, 255, 255, ${p.opacity})`}
          />
        </g>
      ))}
    </svg>
  );
}

export function LogoFull({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <span
        className="font-mono tracking-[0.2em] uppercase text-foreground"
        style={{ fontSize: size * 0.35 }}
      >
        Nearstream
      </span>
    </div>
  );
}
