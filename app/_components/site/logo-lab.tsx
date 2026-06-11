"use client";

import { useEffect, useRef } from "react";

// Five animated takes on the Nearstream `>` chevron mark. All preserve the
// existing dot positions; each one applies a different motion/depth
// interpretation. Shared canvas plumbing, divergent draw fns. Used by
// /design/logo-lab to compare side-by-side.

// Anchor points — same shape as the static NearstreamMark.
// cx/cy/r are in the 0..100 viewbox; opacity is the static baseline.
type Anchor = { cx: number; cy: number; r: number; opacity: number };
const POINTS: Anchor[] = [
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

function dot(
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

// Soft halo for the bigger anchors (carries over from the static mark).
function halo(
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

// ---------- shared canvas hook ----------

function useCanvasLoop(
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

// ---------- shared scaling ----------

function scaleOf(size: number): number {
  return size / 100;
}

// ============================================================
// VARIANT A — "Helix"
// Each anchor has a partner dot orbiting it on a tilted axis.
// The pair reads as a DNA-helix base pair; opacity = z-depth proxy
// (cos of phase). Phase shifts down the chevron so the whole thing
// reads as one spiraling thread.
// ============================================================
function drawHelix(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);

  const time = t * 0.0014;
  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    const bx = p.cx * s;
    const by = p.cy * s;
    const phase = time + i * 0.55;
    const orbitR = (p.r * 2.4) * s;
    const ox = bx + Math.cos(phase) * orbitR;
    const oy = by + Math.sin(phase) * orbitR * 0.35;
    const depth = (Math.cos(phase) + 1) / 2; // 0..1

    // back partner (offset opposite direction, dimmer)
    const backOpacity = p.opacity * (0.15 + (1 - depth) * 0.55);
    halo(ctx, ox, oy, p.r * s, backOpacity);
    dot(ctx, ox, oy, p.r * s * (0.5 + (1 - depth) * 0.4), backOpacity);

    // anchor stays bright
    halo(ctx, bx, by, p.r * s, p.opacity);
    dot(ctx, bx, by, p.r * s, p.opacity);

    // front partner (in front of anchor, brighter)
    const fx = bx - Math.cos(phase) * orbitR;
    const fy = by - Math.sin(phase) * orbitR * 0.35;
    const frontOpacity = p.opacity * (0.2 + depth * 0.7);
    dot(ctx, fx, fy, p.r * s * (0.5 + depth * 0.5), frontOpacity);
  }
}

export function LogoHelix({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawHelix, size);
  return <canvas ref={ref} aria-label="Nearstream — helix variant" role="img" />;
}

// ============================================================
// VARIANT B — "Pulse wave"
// Static chevron, a brightness wave travels along it. Each dot's
// opacity + radius is modulated by sin(time*speed + position-along-path).
// Reads as a calm signal pulsing through the mark.
// ============================================================
function drawPulse(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.002;

  // Only the 11 chevron points get the wave; the satellites (indices 11+)
  // breathe on their own slower phase.
  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    const x = p.cx * s;
    const y = p.cy * s;
    let pulse: number;
    if (i < 11) {
      pulse = (Math.sin(time - i * 0.55) + 1) / 2; // 0..1
    } else {
      pulse = (Math.sin(time * 0.4 + i * 1.3) + 1) / 2 * 0.7 + 0.3;
    }
    const alpha = p.opacity * (0.25 + pulse * 0.75);
    const r = p.r * s * (0.8 + pulse * 0.4);
    halo(ctx, x, y, r, alpha);
    dot(ctx, x, y, r, alpha);
  }
}

export function LogoPulse({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawPulse, size);
  return <canvas ref={ref} aria-label="Nearstream — pulse variant" role="img" />;
}

// ============================================================
// VARIANT C — "Spin"
// The chevron rotates around its vertical mid-axis. Each anchor's
// horizontal position oscillates relative to the apex line; opacity
// fades when the dot is on the "back" side of the rotation. Reads
// as a 3D chevron turning.
// ============================================================
function drawSpin(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const axis = 50; // x of rotation axis in viewbox space
  const angle = t * 0.0008;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    // Distance from axis (signed). Negative = left of axis.
    const dx = p.cx - axis;
    // Treat dx as the "x in 3D"; rotate around y-axis.
    // x' = dx * cos, z' = dx * sin → opacity by z.
    const rx = dx * cos;
    const rz = dx * sin;
    const screenX = (axis + rx) * s;
    const screenY = p.cy * s;
    const depth = (rz + 50) / 100; // -50..50 → 0..1
    const alpha = p.opacity * (0.2 + depth * 0.8);
    const r = p.r * s * (0.6 + depth * 0.6);
    halo(ctx, screenX, screenY, r, alpha);
    dot(ctx, screenX, screenY, r, alpha);
  }
}

export function LogoSpin({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawSpin, size);
  return <canvas ref={ref} aria-label="Nearstream — spin variant" role="img" />;
}

// ============================================================
// VARIANT D — "Halos"
// Each anchor pulses 2-3 concentric translucent halos on offset
// phases — like layers of breath stacking over each other. The
// chevron stays put; depth comes entirely from layered alpha.
// ============================================================
function drawHalos(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.0015;
  const shells = 3;

  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    const x = p.cx * s;
    const y = p.cy * s;
    for (let k = 0; k < shells; k++) {
      const phase = time + i * 0.3 + k * 0.9;
      const wave = (Math.sin(phase) + 1) / 2; // 0..1
      const r = p.r * s * (1 + k * 0.9 + wave * 1.2);
      const alpha = p.opacity * (0.18 - k * 0.05) * (0.4 + wave * 0.6);
      dot(ctx, x, y, r, alpha);
    }
    // bright core on top
    dot(ctx, x, y, p.r * s * 0.7, p.opacity * 0.95);
  }
}

export function LogoHalos({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawHalos, size);
  return <canvas ref={ref} aria-label="Nearstream — halos variant" role="img" />;
}

// ============================================================
// FINAL — "Helix + dust"
// A's helix backbone (DNA base-pair orbit per anchor, depth via
// opacity) plus a couple of tiny low-opacity satellites per anchor
// borrowed from E. The satellites are deliberately much smaller
// than the helix partners — they read as quiet dust, not as a
// second layer of pairs, so the chevron stays the dominant shape.
// ============================================================
function drawFinal(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.0014;
  const SATS = 2;

  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    const bx = p.cx * s;
    const by = p.cy * s;
    const phase = time + i * 0.55;
    const orbitR = (p.r * 2.4) * s;
    const ox = bx + Math.cos(phase) * orbitR;
    const oy = by + Math.sin(phase) * orbitR * 0.35;
    const depth = (Math.cos(phase) + 1) / 2;

    // Tiny dust satellites — drawn FIRST so the helix dots sit on top.
    // Only around the 11 chevron anchors, skipping the existing scattered
    // satellites at i>=11 (they're already faint dust).
    if (i < 11) {
      for (let k = 0; k < SATS; k++) {
        const satPhase = time * (1.4 + k * 0.35) + i * 0.7 + k * 2.1;
        const satOrbit = (p.r * 1.1 + k * 0.5) * s;
        const sx = bx + Math.cos(satPhase) * satOrbit;
        const sy = by + Math.sin(satPhase * 1.3) * satOrbit * 0.75;
        const satAlpha = p.opacity * 0.18 * (1 - k * 0.25);
        const satR = p.r * s * (0.22 - k * 0.04);
        dot(ctx, sx, sy, satR, satAlpha);
      }
    }

    // Back partner (dimmer when on the far side of the orbit)
    const backOpacity = p.opacity * (0.15 + (1 - depth) * 0.55);
    halo(ctx, ox, oy, p.r * s, backOpacity);
    dot(ctx, ox, oy, p.r * s * (0.5 + (1 - depth) * 0.4), backOpacity);

    // Anchor — full brightness, never fades. The chevron shape rests here.
    halo(ctx, bx, by, p.r * s, p.opacity);
    dot(ctx, bx, by, p.r * s, p.opacity);

    // Front partner (brighter when on the near side of the orbit)
    const fx = bx - Math.cos(phase) * orbitR;
    const fy = by - Math.sin(phase) * orbitR * 0.35;
    const frontOpacity = p.opacity * (0.2 + depth * 0.7);
    dot(ctx, fx, fy, p.r * s * (0.5 + depth * 0.5), frontOpacity);
  }
}

export function LogoFinal({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawFinal, size);
  return <canvas ref={ref} aria-label="Nearstream — final variant" role="img" />;
}

// ============================================================
// VARIANT E — "Swarm"
// Each anchor is a faint static dot; a swarm of tiny satellites
// orbits each one at small radii and speeds. The chevron emerges
// from the density of the swarm rather than from fixed positions —
// reads as a constellation slowly settling into shape.
// ============================================================
function drawSwarm(ctx: CanvasRenderingContext2D, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  const s = scaleOf(size);
  const time = t * 0.001;
  const SATS = 4;

  for (let i = 0; i < POINTS.length; i++) {
    const p = POINTS[i];
    const x = p.cx * s;
    const y = p.cy * s;
    // anchor — faint
    dot(ctx, x, y, p.r * s * 0.55, p.opacity * 0.35);

    for (let k = 0; k < SATS; k++) {
      const phase = time * (0.7 + k * 0.21) + i * 0.4 + k * 1.7;
      const orbitR = (p.r * 1.4 + k * 0.6) * s;
      const sx = x + Math.cos(phase) * orbitR;
      const sy = y + Math.sin(phase * 1.3) * orbitR * 0.8;
      const depthAlpha = (Math.cos(phase * 1.1) + 1) / 2; // 0..1
      const alpha = p.opacity * (0.15 + depthAlpha * 0.6) * (1 - k * 0.15);
      const rr = p.r * s * (0.35 - k * 0.05);
      dot(ctx, sx, sy, rr, alpha);
    }
  }
}

export function LogoSwarm({ size = 160 }: { size?: number }) {
  const ref = useCanvasLoop(drawSwarm, size);
  return <canvas ref={ref} aria-label="Nearstream — swarm variant" role="img" />;
}
