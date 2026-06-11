"use client";

import { useEffect, useRef } from "react";

// The official animated Nearstream `>` mark — same chevron geometry as
// the static `NearstreamMark`, with a DNA-helix orbit per anchor and a
// couple of tiny dust satellites underneath. Picked from /design/logo-lab
// after comparing five variants on 2026-06-11.
//
// Static `NearstreamMark` stays for nav and other always-on tiny contexts;
// this animated version is for hero / featured surfaces (landing, reader
// empty state, etc.) where the breathing motion earns its keep.

// ---------- chevron anchor geometry (viewbox 0..100) ----------
type Anchor = { cx: number; cy: number; r: number; opacity: number };

export const MARK_POINTS: Anchor[] = [
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
];

// ---------- small canvas helpers ----------
export function markDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
) {
  if (alpha <= 0 || r <= 0) return;
  ctx.fillStyle = `rgba(245, 245, 245, ${Math.min(1, alpha).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function markHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
) {
  if (alpha <= 0 || r <= 0) return;
  ctx.fillStyle = `rgba(245, 245, 245, ${(alpha * 0.06).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- shared canvas loop hook ----------
export function useMarkCanvasLoop(
  draw: (ctx: CanvasRenderingContext2D, size: number, t: number) => void,
  size: number,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      drawRef.current(ctx!, size, now - start);
      raf = requestAnimationFrame(tick);
    }
    if (prefersReducedMotion) {
      drawRef.current(ctx, size, 0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size]);

  return ref;
}

// ---------- draw function (also used by the snapshot generator) ----------

const TIME_SCALE = 0.0007; // slowed ~½ from the lab default (was 0.0014)
const SAT_COUNT = 2;

/** Renders one frame of the animated mark onto `ctx`. Used both by the live
 *  component and by the PNG snapshot tool — exporting the draw fn means any
 *  size/frame we render in either context is pixel-equivalent. */
export function drawNearstreamMarkAnimated(
  ctx: CanvasRenderingContext2D,
  size: number,
  t: number,
) {
  ctx.clearRect(0, 0, size, size);
  const s = size / 100;
  const time = t * TIME_SCALE;

  for (let i = 0; i < MARK_POINTS.length; i++) {
    const p = MARK_POINTS[i];
    const bx = p.cx * s;
    const by = p.cy * s;
    const phase = time + i * 0.55;
    const orbitR = p.r * 2.4 * s;
    const ox = bx + Math.cos(phase) * orbitR;
    const oy = by + Math.sin(phase) * orbitR * 0.35;
    const depth = (Math.cos(phase) + 1) / 2;

    // Dust satellites — under the helix, around the 11 main chevron anchors.
    if (i < 11) {
      for (let k = 0; k < SAT_COUNT; k++) {
        const satPhase = time * (1.4 + k * 0.35) + i * 0.7 + k * 2.1;
        const satOrbit = (p.r * 1.1 + k * 0.5) * s;
        const sx = bx + Math.cos(satPhase) * satOrbit;
        const sy = by + Math.sin(satPhase * 1.3) * satOrbit * 0.75;
        const satAlpha = p.opacity * 0.18 * (1 - k * 0.25);
        const satR = p.r * s * (0.22 - k * 0.04);
        markDot(ctx, sx, sy, satR, satAlpha);
      }
    }

    // Back helix partner — dimmer when on the far side of the orbit.
    const backOpacity = p.opacity * (0.15 + (1 - depth) * 0.55);
    markHalo(ctx, ox, oy, p.r * s, backOpacity);
    markDot(ctx, ox, oy, p.r * s * (0.5 + (1 - depth) * 0.4), backOpacity);

    // Anchor — full brightness, the chevron shape rests here.
    markHalo(ctx, bx, by, p.r * s, p.opacity);
    markDot(ctx, bx, by, p.r * s, p.opacity);

    // Front helix partner — brighter when on the near side of the orbit.
    const fx = bx - Math.cos(phase) * orbitR;
    const fy = by - Math.sin(phase) * orbitR * 0.35;
    const frontOpacity = p.opacity * (0.2 + depth * 0.7);
    markDot(ctx, fx, fy, p.r * s * (0.5 + depth * 0.5), frontOpacity);
  }
}

// ---------- public component ----------

type Props = {
  size?: number;
  className?: string;
  /** Black plate (default `true`). Set false to inherit the surrounding
   *  background — useful when the mark sits on a non-pitch surface. */
  withBackground?: boolean;
};

export function NearstreamMarkAnimated({
  size = 160,
  className,
  withBackground = false,
}: Props) {
  const ref = useMarkCanvasLoop(drawNearstreamMarkAnimated, size);
  return (
    <canvas
      ref={ref}
      className={className}
      aria-label="Nearstream"
      role="img"
      style={withBackground ? { background: "#000" } : undefined}
    />
  );
}

// ---------- PNG snapshot button ----------

type SnapshotProps = {
  /** Sizes in CSS px to offer as download buttons. */
  sizes?: number[];
  className?: string;
};

/** Renders a row of "Download PNG @ N×N" buttons. Each click rasterises a
 *  single frame of the animated mark to an offscreen canvas at the chosen
 *  size and triggers a browser download. Frame time is `performance.now()`
 *  so each click captures a different moment — refresh-and-retry until you
 *  get one you like. */
export function NearstreamMarkSnapshot({
  sizes = [256, 512, 1024],
  className,
}: SnapshotProps) {
  function downloadAt(target: number) {
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Pitch-black plate so the alpha-multiplied dots resolve cleanly.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, target, target);
    drawNearstreamMarkAnimated(ctx, target, performance.now());
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nearstream-mark-${target}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ""}`}>
      {sizes.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => downloadAt(s)}
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Download {s}×{s}
        </button>
      ))}
    </div>
  );
}
