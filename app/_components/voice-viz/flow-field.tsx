"use client";

// Flow field — a few hundred particles drift along a slowly-rotating
// Perlin vector field, leaving short fading trails. Amplitude bumps
// turbulence (noise coordinate scale) + speed. Reads as "particles
// caught in a breath."

import { useEffect, useRef } from "react";
import { noise01 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Particle = { x: number; y: number };

const PARTICLE_COUNT = 260;
const NOISE_SCALE = 0.006; // sample density of the field
const IDLE_SPEED = 0.5;
const MAX_SPEED = 3.2;
// How aggressively the trail canvas fades between frames. Lower = longer
// trails, higher = shorter/crisper. 0.08 lands on "breath, not smoke."
const TRAIL_FADE_ALPHA = 0.08;

export function FlowField({ size, amplitudeRef, className }: Props) {
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

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);

    // Sprinkle particles across the canvas, avoiding the outer 10% so
    // they don't spawn already-clipped.
    const margin = size * 0.1;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: margin + Math.random() * (size - margin * 2),
      y: margin + Math.random() * (size - margin * 2),
    }));

    let z = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function tick() {
      if (!ctx) return;
      const amp = amplitudeRef.current;
      // Bleed the previous frame toward black — this is what leaves the
      // trails behind moving particles.
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE_ALPHA})`;
      ctx.fillRect(0, 0, size, size);

      const speed = IDLE_SPEED + amp * (MAX_SPEED - IDLE_SPEED);
      // Amplitude widens the "curl" of the field, so louder voice
      // creates tighter vortices vs the gentle drift when idle.
      const scale = NOISE_SCALE * (1 + amp * 1.5);
      const alpha = 0.55 + amp * 0.35;
      ctx.fillStyle = `rgba(245, 245, 245, ${alpha})`;

      for (const p of particles) {
        // Angle = full circle mapped from Perlin at this (x, y, z).
        const n = noise01(p.x * scale, p.y * scale, z);
        const angle = n * Math.PI * 4; // 2 full turns of range for more variety
        p.x += Math.cos(angle) * speed;
        p.y += Math.sin(angle) * speed;
        // Wrap around edges so the field stays populated. Slightly
        // preferable to respawn-at-random — the wrap keeps continuity.
        if (p.x < 0) p.x += size;
        else if (p.x > size) p.x -= size;
        if (p.y < 0) p.y += size;
        else if (p.y > size) p.y -= size;

        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }

      z += 0.002 + amp * 0.006;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      // Draw one frame so the box isn't empty.
      ctx.fillStyle = "rgba(245, 245, 245, 0.55)";
      for (const p of particles) ctx.fillRect(p.x, p.y, 1.5, 1.5);
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
      aria-label="Flow field visualizer"
      role="img"
    />
  );
}
