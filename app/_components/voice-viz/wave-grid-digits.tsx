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
  width: number;
  height: number;
  amplitudeRef: React.MutableRefObject<number>;
  /**
   * Simulation steps per rendered frame. 1 runs the medium at frame rate,
   * which against music read as frantic and out of time with the track —
   * the wave churned several times per beat. Below 1 the medium advances
   * on only some frames, which is what brings it back near musical tempo.
   */
  tempoRef: React.MutableRefObject<number>;
  className?: string;
};

/** Glyph cell size in CSS px — the grid follows the frame's aspect. */
const CELL_PX = 12.3;
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
/**
 * Fraction of amplitude the medium retains per *second*, converted to a
 * per-step damping against the current tempo. Expressed this way so that
 * slowing the tempo slows propagation without also stretching the ring-out
 * — at a fixed per-step damping, tempo 0.4 left the plane still sounding
 * 4.2s after a phrase ended, and phrases ran into each other.
 */
const DECAY_PER_SECOND = 0.43;
const FPS = 60;

export function WaveGridDigits({
  width,
  height,
  amplitudeRef,
  tempoRef,
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

    const cols = Math.max(4, Math.round(width / CELL_PX));
    const rows = Math.max(4, Math.round(height / CELL_PX));
    const fonts = buildFontRamp(MIN_GLYPH, MAX_GLYPH, SIZE_STEPS);
    const cellW = width / cols;
    const cellH = height / rows;

    // Damping matters more than it looks — too little and the plane is
    // still ringing at a third of peak two seconds after you stop talking,
    // and every phrase smears into the next. Set per frame from
    // DECAY_PER_SECOND, since the tempo control moves the step rate.
    const wave = new WaveField(cols, rows, { speed: 0.32, damping: 0.986 });

    // Per-cell scratch, reused every frame — `steps` picks the font bucket,
    // `digits` the character, `heights` the vertical displacement.
    const steps = new Uint8Array(cols * rows);
    const digits = new Uint8Array(cols * rows);
    const heights = new Float32Array(cols * rows);

    let z = 0;
    let stepAcc = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function sample() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
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
      ctx.fillRect(0, 0, width, height);

      // One pass per size bucket so `ctx.font` is assigned 10× a frame
      // rather than once per cell.
      for (let s = 0; s < SIZE_STEPS; s++) {
        ctx.font = fonts[s];
        ctx.fillStyle = `rgba(245, 245, 245, ${0.22 + (s / (SIZE_STEPS - 1)) * 0.7})`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
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
      // Advance the medium at the requested rate rather than once per
      // frame. Injection rides inside the loop so energy and propagation
      // stay in step at any tempo.
      const tempo = Math.max(0.05, tempoRef.current);
      wave.setDamping(Math.pow(DECAY_PER_SECOND, 1 / (tempo * FPS)));
      stepAcc += tempo;
      let guard = 0;
      while (stepAcc >= 1 && guard++ < 8) {
        if (amp > INJECT_FLOOR) {
          wave.inject((cols - 1) / 2, (rows - 1) / 2, amp * INJECT_GAIN, 2);
        }
        wave.step();
        stepAcc -= 1;
      }
      z += 0.0012;
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
  }, [width, height, amplitudeRef, tempoRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Wave grid visualizer, digits by height"
      role="img"
    />
  );
}
