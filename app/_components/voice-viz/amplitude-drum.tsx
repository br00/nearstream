"use client";

// Amplitude drum — a seismograph wrapped into a circle. Each frame writes
// the current level into a ring buffer at the write head; every sample is
// a point whose radius encodes the level it captured. Unlike every other
// candidate this one is a *record*, not a reaction: at the end of a note
// the ring holds the shape of the whole sentence, which makes it the only
// one that also works as a still frame (OG image, digest card).

import { useEffect, useRef } from "react";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

const SAMPLES = 300; // ~5s of history at 60fps
const BASE_RADIUS_FRAC = 0.52;
const SWING_FRAC = 0.34; // how far a full-amplitude sample pushes outward

export function AmplitudeDrum({ size, amplitudeRef, className }: Props) {
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

    const history = new Float32Array(SAMPLES);
    let head = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const half = Math.min(cx, cy);
      const base = half * BASE_RADIUS_FRAC;
      const swing = half * SWING_FRAC;

      // Faint baseline so the silent state is a visible ring rather than
      // an empty box.
      ctx.strokeStyle = "rgba(245, 245, 245, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, base, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < SAMPLES; i++) {
        // Age measured backwards from the head, so the oldest sample —
        // the one about to be overwritten — is the faintest.
        const age = (head - i + SAMPLES) % SAMPLES;
        const fade = 1 - age / SAMPLES;
        // -π/2 puts the write head at 12 o'clock.
        const angle = (i / SAMPLES) * Math.PI * 2 - Math.PI / 2;
        const r = base + history[i] * swing;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        ctx.fillStyle = `rgba(245, 245, 245, ${0.1 + fade * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.1 + history[i] * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      history[head] = amplitudeRef.current;
      head = (head + 1) % SAMPLES;
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
  }, [size, amplitudeRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Amplitude drum visualizer"
      role="img"
    />
  );
}
