"use client";

// Ant traces (M) — the fluid reading of the same idea. Same wave seen from
// above, but instead of sampling it onto a grid of glyphs, a few hundred
// agents walk the surface and leave fading trails.
//
// They don't run downhill. Each ant steers *along* the contour — the
// direction perpendicular to the local gradient — so a ripple leaving the
// centre gets traced out as a ring, and the trails accumulate into the
// shape of the wavefront rather than collapsing onto it. Where the surface
// is flat the steering has nothing to grip and they wander, which is what
// makes silence drift instead of freeze.
//
// This is the loosest candidate: it records beautifully and reads as one
// organism, but it carries no frequency information at all, and unlike the
// glyph grids it has no fixed structure to fall back on.

import { useEffect, useRef } from "react";
import { WaveField } from "./wave-field";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Ant = { x: number; y: number; heading: number };

const GRID = 56;
const ANT_COUNT = 240;
const IDLE_SPEED = 0.35;
const MAX_SPEED = 2.6;
/**
 * Gradient is small in absolute terms; these lift it into a useful 0–1.
 * They have to be set against the *measured* gradient, not guessed — the
 * first pass had both saturating at 1.0 on the mean, which meant every ant
 * ran flat out with full steering at all times and the piece had no
 * dynamics at all. Tuned so an average point pulls gently and only the
 * wavefront itself commands a hard turn.
 */
const PULL_GAIN = 4;
const SPEED_GAIN = 3;
/** Steering authority once the gradient is strong. Above ~0.4 they oscillate. */
const TURN_RATE = 0.28;
const WANDER = 0.22;
const TRAIL_FADE_ALPHA = 0.055;
const INJECT_FLOOR = 0.06;
const INJECT_GAIN = 0.12;

const TWO_PI = Math.PI * 2;

export function AntTraces({ size, amplitudeRef, className }: Props) {
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

    const wave = new WaveField(GRID, GRID, { speed: 0.3, damping: 0.988 });
    const toGrid = GRID / size;

    const ants: Ant[] = Array.from({ length: ANT_COUNT }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      heading: Math.random() * TWO_PI,
    }));

    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function tick() {
      if (!ctx) return;
      const amp = amplitudeRef.current;
      if (amp > INJECT_FLOOR) {
        wave.inject((GRID - 1) / 2, (GRID - 1) / 2, amp * INJECT_GAIN, 3);
      }
      wave.step();

      // Bleed toward black — this is what turns positions into traces.
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE_ALPHA})`;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = `rgba(245, 245, 245, ${0.5 + amp * 0.4})`;

      for (const a of ants) {
        // Central differences, clamped off the pinned border ring.
        const c = Math.min(GRID - 2, Math.max(1, Math.round(a.x * toGrid)));
        const r = Math.min(GRID - 2, Math.max(1, Math.round(a.y * toGrid)));
        const gx = wave.at(c + 1, r) - wave.at(c - 1, r);
        const gy = wave.at(c, r + 1) - wave.at(c, r - 1);
        const g = Math.sqrt(gx * gx + gy * gy);

        // Perpendicular to the gradient = along the contour.
        const desired = Math.atan2(gx, -gy);
        let diff = desired - a.heading;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        const pull = Math.min(1, g * PULL_GAIN);
        a.heading += diff * pull * TURN_RATE + (Math.random() - 0.5) * WANDER;

        const speed =
          IDLE_SPEED + Math.min(1, g * SPEED_GAIN) * (MAX_SPEED - IDLE_SPEED);
        a.x += Math.cos(a.heading) * speed;
        a.y += Math.sin(a.heading) * speed;

        if (a.x < 0) a.x += size;
        else if (a.x > size) a.x -= size;
        if (a.y < 0) a.y += size;
        else if (a.y > size) a.y -= size;

        ctx.fillRect(a.x, a.y, 1.4, 1.4);
      }

      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      ctx.fillStyle = "rgba(245, 245, 245, 0.5)";
      for (const a of ants) ctx.fillRect(a.x, a.y, 1.4, 1.4);
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
      aria-label="Ant traces visualizer"
      role="img"
    />
  );
}
