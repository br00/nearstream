"use client";

// Ant traces (M) — the fluid reading of the wave. Agents walk the surface
// and leave fading trails.
//
// They don't run downhill. Each ant steers *along* the contour — the
// direction perpendicular to the local gradient — so a ripple gets traced
// out as a front and the trails accumulate into its shape rather than
// collapsing onto it. Where the surface is flat the steering has nothing to
// grip and they wander, which is what makes silence drift instead of freeze.
//
// The emitter moves. In the first pass everything entered at the dead
// centre, which meant the contours were concentric circles by construction
// and the piece came out as a ring with fluid around it — too close to the
// human-circle mark it's supposed to be distinct from, and directly behind
// the play button the shipped player overlays in that exact spot. Now the
// source wanders: pitch pushes it along one axis, a slow noise walk carries
// the other, so the front is never a circle and never centred.

import { useEffect, useRef } from "react";
import { WaveField } from "./wave-field";
import { spectralCentroid } from "./spectrum";
import type { FrequencyData } from "./use-audio-amplitude";
import { noise01 } from "./perlin";

/** Live-tunable from the lab; read through a ref so sliders don't re-seed. */
export type AntParams = {
  /** Per-frame bleed toward black. Lower = longer trails. */
  trailFade: number;
  /** Random heading jitter per frame, radians. */
  wander: number;
  /** How hard an ant commits to the contour when the gradient is strong. */
  turnRate: number;
  /** Fixed dead centre, or a wandering source. */
  emitter: "centre" | "wander";
};

export const ANT_DEFAULTS: AntParams = {
  trailFade: 0.055,
  wander: 0.22,
  turnRate: 0.28,
  emitter: "wander",
};

type Props = {
  width: number;
  height: number;
  amplitudeRef: React.MutableRefObject<number>;
  frequencyRef: React.MutableRefObject<FrequencyData>;
  antCount: number;
  paramsRef: React.MutableRefObject<AntParams>;
  className?: string;
};

/** Simulation cell size in CSS px — the grid follows the frame's aspect. */
const CELL_PX = 5.7;
const IDLE_SPEED = 0.35;
const MAX_SPEED = 2.6;
/**
 * Gradient is small in absolute terms; these lift it into a useful 0–1.
 * Set against the measured gradient, not guessed — the first pass had both
 * saturating at 1.0 on the mean, so every ant ran flat out with full
 * steering at all times and the piece had no dynamics at all.
 */
const PULL_GAIN = 4;
const SPEED_GAIN = 3;
const INJECT_FLOOR = 0.06;
const INJECT_GAIN = 0.12;
/** Keeps the wandering source off the frame edge, in cells. */
const EMITTER_MARGIN = 6;
const EMITTER_EASE = 0.03;

const TWO_PI = Math.PI * 2;

export function AntTraces({
  width,
  height,
  amplitudeRef,
  frequencyRef,
  antCount,
  paramsRef,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const cols = Math.max(8, Math.round(width / CELL_PX));
    const rows = Math.max(8, Math.round(height / CELL_PX));
    const wave = new WaveField(cols, rows, { speed: 0.3, damping: 0.988 });
    const toGridX = cols / width;
    const toGridY = rows / height;

    const ants = Array.from({ length: antCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      heading: Math.random() * TWO_PI,
    }));

    let emitX = cols / 2;
    let emitY = rows / 2;
    let wanderZ = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function moveEmitter() {
      const p = paramsRef.current;
      if (p.emitter === "centre") {
        emitX = (cols - 1) / 2;
        emitY = (rows - 1) / 2;
        return;
      }
      // Pitch drives one axis, a slow noise walk the other. `pow` spreads
      // the low end, where speech actually sits.
      const centroid = Math.pow(spectralCentroid(frequencyRef.current), 0.6);
      const spanX = cols - 1 - EMITTER_MARGIN * 2;
      const spanY = rows - 1 - EMITTER_MARGIN * 2;
      const tx = EMITTER_MARGIN + centroid * spanX;
      // Off-lattice x/y on purpose: classic Perlin is zero at integer
      // corners, and sampling (0, 0, z) covers only ~78% of the span an
      // arbitrary point does, biased high — the source would have wandered
      // a narrower, off-centre band than intended.
      const ty = EMITTER_MARGIN + noise01(11.3, 7.7, wanderZ) * spanY;
      emitX += (tx - emitX) * EMITTER_EASE;
      emitY += (ty - emitY) * EMITTER_EASE;
      wanderZ += 0.0016;
    }

    function tick() {
      if (!ctx) return;
      const p = paramsRef.current;
      const amp = amplitudeRef.current;

      moveEmitter();
      if (amp > INJECT_FLOOR) {
        wave.inject(emitX, emitY, amp * INJECT_GAIN, 3);
      }
      wave.step();

      // Bleed toward black — this is what turns positions into traces.
      ctx.fillStyle = `rgba(0, 0, 0, ${p.trailFade})`;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = `rgba(245, 245, 245, ${0.5 + amp * 0.4})`;

      for (const a of ants) {
        // Central differences, clamped off the pinned border ring.
        const c = Math.min(cols - 2, Math.max(1, Math.round(a.x * toGridX)));
        const r = Math.min(rows - 2, Math.max(1, Math.round(a.y * toGridY)));
        const gx = wave.at(c + 1, r) - wave.at(c - 1, r);
        const gy = wave.at(c, r + 1) - wave.at(c, r - 1);
        const g = Math.sqrt(gx * gx + gy * gy);

        // Perpendicular to the gradient = along the contour.
        const desired = Math.atan2(gx, -gy);
        let diff = desired - a.heading;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        const pull = Math.min(1, g * PULL_GAIN);
        a.heading += diff * pull * p.turnRate + (Math.random() - 0.5) * p.wander;

        const speed =
          IDLE_SPEED + Math.min(1, g * SPEED_GAIN) * (MAX_SPEED - IDLE_SPEED);
        a.x += Math.cos(a.heading) * speed;
        a.y += Math.sin(a.heading) * speed;

        if (a.x < 0) a.x += width;
        else if (a.x > width) a.x -= width;
        if (a.y < 0) a.y += height;
        else if (a.y > height) a.y -= height;

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
  }, [width, height, amplitudeRef, frequencyRef, antCount, paramsRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Ant traces visualizer"
      role="img"
    />
  );
}
