"use client";

// Spectral columns — the only candidate that reads the FFT rather than a
// single RMS number, so it shows *timbre*, not just loudness. Bins are
// grouped logarithmically (speech energy is bunched low) into 28 columns,
// each drawn as a stack of dots rather than a bar. Two different voices
// look different here; under RMS-only they don't.

import { useEffect, useRef } from "react";
import type { FrequencyData } from "./use-audio-amplitude";

type Props = {
  size: number;
  frequencyRef: React.MutableRefObject<FrequencyData>;
  className?: string;
};

const COLUMNS = 28;
const MAX_DOTS = 18;
const SMOOTHING = 0.35; // per-column attack/release, 0 = frozen, 1 = raw

export function SpectralColumns({ size, frequencyRef, className }: Props) {
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

    const marginX = size * 0.08;
    const marginY = size * 0.1;
    const colStep = (size - marginX * 2) / (COLUMNS - 1);
    const rowStep = (size - marginY * 2) / (MAX_DOTS - 1);

    const levels = new Float32Array(COLUMNS);
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /**
     * Log-spaced bin edges, computed once against the current bin count.
     * Linear grouping would put 24 of 28 columns above 5kHz where a voice
     * has almost nothing, leaving the visual dead.
     */
    function binEdges(binCount: number): number[] {
      const edges: number[] = [];
      for (let c = 0; c <= COLUMNS; c++) {
        const t = c / COLUMNS;
        edges.push(Math.floor(Math.pow(binCount, t)) - 1);
      }
      return edges;
    }

    let edges = binEdges(frequencyRef.current.length || 128);
    let edgesFor = frequencyRef.current.length;

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      for (let c = 0; c < COLUMNS; c++) {
        const lit = Math.round(levels[c] * MAX_DOTS);
        const x = marginX + c * colStep;
        for (let r = 0; r < MAX_DOTS; r++) {
          const y = size - marginY - r * rowStep;
          const on = r < lit;
          // Unlit dots stay faintly visible so the grid reads as a fixed
          // instrument rather than shapes appearing out of nowhere.
          ctx.fillStyle = on
            ? `rgba(245, 245, 245, ${0.9 - (r / MAX_DOTS) * 0.35})`
            : "rgba(245, 245, 245, 0.08)";
          ctx.beginPath();
          ctx.arc(x, y, on ? 2 : 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function tick() {
      const freq = frequencyRef.current;
      if (freq.length !== edgesFor) {
        edges = binEdges(freq.length);
        edgesFor = freq.length;
      }

      for (let c = 0; c < COLUMNS; c++) {
        const lo = Math.max(0, edges[c]);
        const hi = Math.max(lo + 1, Math.min(freq.length, edges[c + 1] + 1));
        let sum = 0;
        for (let b = lo; b < hi; b++) sum += freq[b];
        const avg = sum / (hi - lo) / 255;
        // Tilt the top end up — high bins are genuinely quieter, and
        // without this the right half of the grid never lights.
        const tilted = Math.min(1, avg * (1 + (c / COLUMNS) * 1.6));
        levels[c] += (tilted - levels[c]) * SMOOTHING;
      }

      draw();
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      draw();
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size, frequencyRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Spectral columns visualizer"
      role="img"
    />
  );
}
