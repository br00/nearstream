"use client";

// Ripple interference — three off-centre sources emit continuous circular
// waves; a fixed point grid samples their sum. Nothing moves position,
// only brightness, so the motion is entirely the interference pattern
// sliding through a still lattice. Amplitude drives wave speed and
// contrast: silence is a near-flat grey field, speech is a moiré.

import { useEffect, useRef } from "react";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

const GRID = 30;
const WAVELENGTH = 34; // px between crests
const BASE_SPEED = 0.035; // phase radians per frame at silence

// Deliberately asymmetric so the pattern never resolves into something
// mirror-symmetric, which reads as a mistake rather than a design.
const SOURCES: { fx: number; fy: number }[] = [
  { fx: 0.26, fy: 0.31 },
  { fx: 0.74, fy: 0.42 },
  { fx: 0.48, fy: 0.79 },
];

export function RippleInterference({ size, amplitudeRef, className }: Props) {
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

    const margin = size * 0.07;
    const step = (size - margin * 2) / (GRID - 1);
    const k = (Math.PI * 2) / WAVELENGTH;

    const sources = SOURCES.map((s, i) => ({
      x: s.fx * size,
      y: s.fy * size,
      phase: 0,
      // Slightly different speeds per source keep the pattern from
      // repeating on a short cycle.
      rate: 1 + i * 0.18,
    }));

    // Distance from every grid point to every source, precomputed —
    // 2700 hypots per frame otherwise, and they never change.
    const dists: Float32Array[] = sources.map(() => new Float32Array(GRID * GRID));
    const px = new Float32Array(GRID * GRID);
    const py = new Float32Array(GRID * GRID);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const i = gy * GRID + gx;
        const x = margin + gx * step;
        const y = margin + gy * step;
        px[i] = x;
        py[i] = y;
        for (let s = 0; s < sources.length; s++) {
          dists[s][i] = Math.hypot(x - sources[s].x, y - sources[s].y);
        }
      }
    }

    let raf = 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function draw(amp: number) {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      const contrast = 0.25 + amp * 0.75;
      const dotR = 1.1 + amp * 0.9;

      for (let i = 0; i < px.length; i++) {
        let sum = 0;
        for (let s = 0; s < sources.length; s++) {
          sum += Math.sin(dists[s][i] * k - sources[s].phase);
        }
        // sum ∈ [-3, 3] → [0, 1], then pulled toward mid-grey by the
        // inverse of amplitude so a silent note isn't a strobing field.
        const norm = (sum / sources.length + 1) * 0.5;
        const alpha = 0.1 + (0.5 + (norm - 0.5) * contrast * 2) * 0.75;
        ctx.fillStyle = `rgba(245, 245, 245, ${Math.max(0.02, Math.min(1, alpha))})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      const amp = amplitudeRef.current;
      const speed = BASE_SPEED * (1 + amp * 5);
      for (const s of sources) s.phase += speed * s.rate;
      draw(amp);
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      draw(0);
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
      aria-label="Ripple interference visualizer"
      role="img"
    />
  );
}
