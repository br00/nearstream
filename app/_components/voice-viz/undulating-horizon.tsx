"use client";

// Undulating horizon — ~64 points along a horizontal midline, each
// vertically displaced by Perlin noise. Amplitude drives the vertical
// range. Waveform-adjacent but pointwise — no fill, no stroke between
// points, just the dots. Reads as "voice as horizon" without being a
// literal audio waveform.

import { useEffect, useRef } from "react";
import { perlin3 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

const POINT_COUNT = 64;
const IDLE_RANGE_FRAC = 0.04; // vertical wobble at amp=0 (as fraction of size)
const MAX_RANGE_FRAC = 0.32; // vertical wobble at amp=1

export function UndulatingHorizon({ size, amplitudeRef, className }: Props) {
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

    function tick() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      const amp = amplitudeRef.current;
      const midY = size / 2;
      const range = size * (IDLE_RANGE_FRAC + amp * (MAX_RANGE_FRAC - IDLE_RANGE_FRAC));
      const margin = size * 0.06;
      const usable = size - margin * 2;
      const step = usable / (POINT_COUNT - 1);
      const alpha = 0.65 + amp * 0.3;
      ctx.fillStyle = `rgba(245, 245, 245, ${alpha})`;

      for (let i = 0; i < POINT_COUNT; i++) {
        const x = margin + i * step;
        // Per-point Perlin seed on the x axis so neighbouring points
        // move together into wave-like undulations rather than each
        // jittering independently.
        const n = perlin3(i * 0.18, 0, z);
        const y = midY + n * range;
        // Points closer to the edges taper visually — echoes of a
        // real horizon fading into the frame.
        const edgeFade = Math.min(
          1,
          Math.min(i, POINT_COUNT - 1 - i) / (POINT_COUNT * 0.15),
        );
        const r = 1.5 + edgeFade * 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      z += 0.015 + amp * 0.02;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "rgba(245, 245, 245, 0.65)";
      const midY = size / 2;
      const margin = size * 0.06;
      const usable = size - margin * 2;
      const step = usable / (POINT_COUNT - 1);
      for (let i = 0; i < POINT_COUNT; i++) {
        ctx.beginPath();
        ctx.arc(margin + i * step, midY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
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
      aria-label="Undulating horizon visualizer"
      role="img"
    />
  );
}
