"use client";

// Wave grid, height-digits (K) — Alessandro's Processing "kraftwerk" sketch
// with the noise field swapped for a real one.
//
// The original samples 4D OpenSimplex per cell and lets that one scalar
// drive glyph size, glyph offset and which digit gets drawn. This keeps all
// three, and only replaces where the scalar comes from: instead of looping
// noise, it's the height of a 2D wave that the audio is pushing into the
// middle of the plane. Sound seen from directly above.
//
// Note what the digit means here, because it's the thing L changes: it's
// the height, re-encoded. It tells you nothing the size didn't already. In
// the original that's fine — the reference *is* Kraftwerk's "Numbers". As
// information design it's decoration.

import { useEffect, useRef } from "react";
import { WaveField } from "./wave-field";
import { buildFontRamp, sizeStep } from "./glyph-grid";
import { noise01 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

const COLS = 26;
const ROWS = 26;
const SIZE_STEPS = 10;
const MIN_GLYPH = 3.5;
const MAX_GLYPH = 15;
/**
 * Height → normalized range. A second of sustained speech peaks the medium
 * near 1.9, so this puts the crest at full glyph size without pinning the
 * whole plane there.
 */
const GAIN = 0.55;
/** Below this the mic's noise floor would keep the surface permanently rippling. */
const INJECT_FLOOR = 0.06;
const INJECT_GAIN = 0.5;
/** A slow Perlin breath so silence is a living surface, not a dead grid. */
const IDLE_AMOUNT = 0.14;

export function WaveGridDigits({ size, amplitudeRef, className }: Props) {
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

    const fonts = buildFontRamp(MIN_GLYPH, MAX_GLYPH, SIZE_STEPS);
    const cellW = size / COLS;
    const cellH = size / ROWS;

    // Damping matters more than it looks: at 0.994 the plane is still
    // ringing at a third of peak two seconds after you stop talking, and
    // every phrase smears into the next. This settles inside a second.
    const wave = new WaveField(COLS, ROWS, { speed: 0.32, damping: 0.986 });

    // Per-cell scratch, reused every frame — `steps` picks the font bucket,
    // `digits` the character, `heights` the vertical displacement.
    const steps = new Uint8Array(COLS * ROWS);
    const digits = new Uint8Array(COLS * ROWS);
    const heights = new Float32Array(COLS * ROWS);

    let z = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function sample() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c;
          // Wave height plus a slow idle undulation, squashed to −1..1.
          const idle = (noise01(c * 0.16, r * 0.16, z) - 0.5) * 2 * IDLE_AMOUNT;
          const h = Math.max(-1, Math.min(1, wave.at(c, r) * GAIN + idle));
          heights[i] = h;
          // Same two mappings as the sketch: |height| → size, height → digit.
          steps[i] = sizeStep(Math.abs(h), SIZE_STEPS);
          digits[i] = Math.max(0, Math.min(9, Math.round((h + 1) * 4.5)));
        }
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      // One pass per size bucket so `ctx.font` is assigned 10× a frame
      // rather than 676×.
      for (let s = 0; s < SIZE_STEPS; s++) {
        ctx.font = fonts[s];
        ctx.fillStyle = `rgba(245, 245, 245, ${0.22 + (s / (SIZE_STEPS - 1)) * 0.7})`;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            if (steps[i] !== s) continue;
            const x = (c + 0.5) * cellW;
            // Displacing by height is what tips the grid from "chart" into
            // "surface lit from an angle" — it's the sketch's whole trick.
            const y = (r + 0.5) * cellH - heights[i] * cellH * 0.9;
            ctx.fillText(String(digits[i]), x, y);
          }
        }
      }
    }

    function tick() {
      const amp = amplitudeRef.current;
      if (amp > INJECT_FLOOR) {
        // Everything enters at one fixed point: the centre of the plane.
        wave.inject((COLS - 1) / 2, (ROWS - 1) / 2, amp * INJECT_GAIN, 2);
      }
      wave.step();
      z += 0.0025;
      sample();
      draw();
      raf = requestAnimationFrame(tick);
    }

    sample();
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
      aria-label="Wave grid visualizer, digits by height"
      role="img"
    />
  );
}
