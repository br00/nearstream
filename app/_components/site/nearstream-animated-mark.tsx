"use client";

import { useEffect, useRef } from "react";

// Animated version of the static NearstreamMark — same 15 dots that form the
// `>` chevron, but each one breathes (opacity drift) and jitters slightly
// (position drift) on its own seeded phase. Same family of motion as the
// Human Circle, scaled down for a tiny brand mark.
//
// SVG, not canvas — 15 dots is cheap and lets us inherit `currentColor` so
// the mark adopts whatever text color it's nested inside.

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
  { cx: 70, cy: 32, r: 1.2, opacity: 0.2 },
  { cx: 32, cy: 44, r: 1.0, opacity: 0.15 },
  { cx: 72, cy: 60, r: 1.4, opacity: 0.2 },
  { cx: 28, cy: 70, r: 1.1, opacity: 0.15 },
] as const;

// Cheap two-sine pseudo-noise — good enough for organic-feeling drift on 15
// independent dots. Returns roughly -1..1.
function pseudo(t: number, seed: number): number {
  return (
    Math.sin(t * 0.0009 + seed) * 0.6 +
    Math.cos(t * 0.0013 + seed * 1.7) * 0.4
  );
}

type Props = {
  size?: number;
  className?: string;
};

export function NearstreamAnimatedMark({ size = 80, className }: Props) {
  const circleRefs = useRef<(SVGCircleElement | null)[]>([]);
  // Background glow circles for the bigger dots (matches the static mark).
  const glowRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    let raf = 0;
    let start = performance.now();

    function tick(now: number) {
      const t = now - start;
      for (let i = 0; i < POINTS.length; i++) {
        const p = POINTS[i];
        const dx = pseudo(t, i * 7) * 1.4;
        const dy = pseudo(t, i * 11 + 13) * 1.4;
        const breath = (pseudo(t, i * 5 + 19) + 1) / 2; // 0..1
        const opacity = p.opacity * (0.5 + 0.5 * breath);

        const c = circleRefs.current[i];
        if (c) {
          c.setAttribute("cx", String(p.cx + dx));
          c.setAttribute("cy", String(p.cy + dy));
          c.setAttribute("fill-opacity", opacity.toFixed(3));
        }
        const g = glowRefs.current[i];
        if (g) {
          g.setAttribute("cx", String(p.cx + dx));
          g.setAttribute("cy", String(p.cy + dy));
          g.setAttribute("fill-opacity", (opacity * 0.06).toFixed(3));
        }
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-label="Nearstream"
      role="img"
      className={className}
    >
      {POINTS.map((p, i) => (
        <g key={i}>
          {p.r > 2.5 && (
            <circle
              ref={(el) => {
                glowRefs.current[i] = el;
              }}
              cx={p.cx}
              cy={p.cy}
              r={p.r * 3}
              fillOpacity={p.opacity * 0.06}
            />
          )}
          <circle
            ref={(el) => {
              circleRefs.current[i] = el;
            }}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fillOpacity={p.opacity}
          />
        </g>
      ))}
    </svg>
  );
}
