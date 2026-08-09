"use client";

// Concentric echoes — 5 nested Perlin-wobbled rings, each drawn on a
// different z-slice of the noise field so they morph independently.
// Amplitude spreads the rings radially and adds a bit more wobble.
// Reads as "resonance" — a family cousin of the human-circle but
// distinct enough not to be mistaken for it.

import { useEffect, useRef } from "react";
import { noise01, mapTo } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

const RING_COUNT = 5;
const ANGLE_STEP = 0.06; // point density around each ring
const N_MAX = 0.4;
const RADIUS_RANGE_FRAC = 0.06;

export function ConcentricEchoes({ size, amplitudeRef, className }: Props) {
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

    let z = 0;
    let raf = 0;

    function drawRing(cx: number, cy: number, ringIdx: number, half: number, amp: number) {
      if (!ctx) return;
      // Base radius sweep — outer rings sit further from centre. Amplitude
      // pushes them outward, up to +20% of half at peak.
      const baseFrac = 0.35 + ringIdx * 0.11;
      const radiusBase = half * baseFrac * (1 + amp * 0.2);
      const radiusRange = half * RADIUS_RANGE_FRAC * (1 + amp * 2);
      const zSlice = z + ringIdx * 7; // out-of-phase per ring
      const alpha = mapTo(ringIdx, 0, RING_COUNT - 1, 0.85, 0.35);
      ctx.strokeStyle = `rgba(245, 245, 245, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let first = true;
      for (let a = 0; a < Math.PI * 2 + ANGLE_STEP; a += ANGLE_STEP) {
        const xoff = mapTo(Math.cos(a), -1, 1, 0, N_MAX * (1 + amp * 0.6));
        const yoff = mapTo(Math.sin(a), -1, 1, 0, N_MAX * (1 + amp * 0.6));
        const n = noise01(xoff, yoff, zSlice);
        const r = mapTo(n, 0, 1, radiusBase, radiusBase + radiusRange * 2);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    function tick() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const half = Math.min(cx, cy);
      const amp = amplitudeRef.current;
      for (let i = 0; i < RING_COUNT; i++) {
        drawRing(cx, cy, i, half, amp);
      }
      z += 0.003;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      // One frame for the idle state.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const half = Math.min(cx, cy);
      for (let i = 0; i < RING_COUNT; i++) drawRing(cx, cy, i, half, 0);
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
      aria-label="Concentric echoes visualizer"
      role="img"
    />
  );
}
