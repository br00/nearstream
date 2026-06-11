"use client";

// Parents of the chosen Final mark. Kept around so we can keep comparing
// against them in /design/logo-lab without losing the alternatives. The
// Final mark itself lives in `nearstream-mark-animated.tsx` (it's the
// public component); we re-export it as `LogoFinal` so the lab page can
// keep one consistent import path.

import {
  MARK_POINTS,
  markDot,
  markHalo,
  useMarkCanvasLoop,
  NearstreamMarkAnimated,
} from "./nearstream-mark-animated";

export const LogoFinal = NearstreamMarkAnimated;

function scaleOf(size: number): number {
  return size / 100;
}

// ============================================================
// A — "Helix" (the backbone of Final, without the dust)
// ============================================================
function drawHelix(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.0007; // matched to Final's slowed cadence

  for (let i = 0; i < MARK_POINTS.length; i++) {
    const p = MARK_POINTS[i];
    const bx = p.cx * s;
    const by = p.cy * s;
    const phase = time + i * 0.55;
    const orbitR = p.r * 2.4 * s;
    const ox = bx + Math.cos(phase) * orbitR;
    const oy = by + Math.sin(phase) * orbitR * 0.35;
    const depth = (Math.cos(phase) + 1) / 2;

    const backOpacity = p.opacity * (0.15 + (1 - depth) * 0.55);
    markHalo(ctx, ox, oy, p.r * s, backOpacity);
    markDot(ctx, ox, oy, p.r * s * (0.5 + (1 - depth) * 0.4), backOpacity);

    markHalo(ctx, bx, by, p.r * s, p.opacity);
    markDot(ctx, bx, by, p.r * s, p.opacity);

    const fx = bx - Math.cos(phase) * orbitR;
    const fy = by - Math.sin(phase) * orbitR * 0.35;
    const frontOpacity = p.opacity * (0.2 + depth * 0.7);
    markDot(ctx, fx, fy, p.r * s * (0.5 + depth * 0.5), frontOpacity);
  }
}

export function LogoHelix({ size = 160 }: { size?: number }) {
  const ref = useMarkCanvasLoop(drawHelix, size);
  return <canvas ref={ref} aria-label="Nearstream — helix variant" role="img" />;
}

// ============================================================
// E — "Swarm" (the dust source for Final)
// ============================================================
function drawSwarm(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.0005; // matched-slow
  const SATS = 4;

  for (let i = 0; i < MARK_POINTS.length; i++) {
    const p = MARK_POINTS[i];
    const x = p.cx * s;
    const y = p.cy * s;
    markDot(ctx, x, y, p.r * s * 0.55, p.opacity * 0.35);

    for (let k = 0; k < SATS; k++) {
      const phase = time * (0.7 + k * 0.21) + i * 0.4 + k * 1.7;
      const orbitR = (p.r * 1.4 + k * 0.6) * s;
      const sx = x + Math.cos(phase) * orbitR;
      const sy = y + Math.sin(phase * 1.3) * orbitR * 0.8;
      const depthAlpha = (Math.cos(phase * 1.1) + 1) / 2;
      const alpha = p.opacity * (0.15 + depthAlpha * 0.6) * (1 - k * 0.15);
      const rr = p.r * s * (0.35 - k * 0.05);
      markDot(ctx, sx, sy, rr, alpha);
    }
  }
}

export function LogoSwarm({ size = 160 }: { size?: number }) {
  const ref = useMarkCanvasLoop(drawSwarm, size);
  return <canvas ref={ref} aria-label="Nearstream — swarm variant" role="img" />;
}
