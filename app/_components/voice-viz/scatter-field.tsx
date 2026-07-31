"use client";

// Scatter field — a grid of points, each perturbed away from its home
// position by a per-point Perlin sample. Amplitude expands the
// perturbation radius so quiet passes read as a still grid and loud
// passes as a shaken snow globe. No macro shape at all — this is the
// "no boundary" cousin of the wobbly-circle.

import { useEffect, useRef } from "react";
import { perlin3 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

// Grid density. 20×20 = 400 points — enough to read as a field, sparse
// enough that individual points are visible when they move.
const GRID = 20;
const IDLE_JITTER = 1.5; // px displacement when amplitude = 0
const MAX_JITTER_FRAC = 0.06; // px displacement at amp=1, as fraction of canvas

export function ScatterField({ size, amplitudeRef, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    // Home positions for each grid point — computed once so a point
    // wobbles around its own home rather than roaming.
    const margin = size * 0.08;
    const usable = size - margin * 2;
    const step = usable / (GRID - 1);
    const home: Array<{ hx: number; hy: number; seedX: number; seedY: number }> = [];
    for (let iy = 0; iy < GRID; iy++) {
      for (let ix = 0; ix < GRID; ix++) {
        home.push({
          hx: margin + ix * step,
          hy: margin + iy * step,
          // Per-point Perlin seed offsets so neighbouring points don't
          // sample the same noise slice (they'd all wobble in lockstep).
          seedX: ix * 3.13 + iy * 1.7,
          seedY: iy * 3.13 + ix * 1.7,
        });
      }
    }

    let z = 0;
    let raf = 0;

    function tick() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      const amp = amplitudeRef.current;
      const maxJitter = size * MAX_JITTER_FRAC;
      const jitter = IDLE_JITTER + amp * (maxJitter - IDLE_JITTER);
      // Opacity climbs with amplitude so loud passes visibly "flash"
      // rather than only jiggle. Small effect — this is a secondary lever.
      const alpha = 0.55 + amp * 0.35;
      ctx.fillStyle = `rgba(245, 245, 245, ${alpha})`;

      for (const p of home) {
        const dx = perlin3(p.seedX * 0.1, 0, z) * jitter;
        const dy = perlin3(0, p.seedY * 0.1, z) * jitter;
        const x = p.hx + dx;
        const y = p.hy + dy;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }

      z += 0.015 + amp * 0.02;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "rgba(245, 245, 245, 0.55)";
      for (const p of home) ctx.fillRect(p.hx - 1, p.hy - 1, 2, 2);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size, amplitudeRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Scatter field visualizer"
      role="img"
    />
  );
}
