"use client";

// Wave grid, frequency-digits (L) — the answer to "instead of numbers,
// what could we have?" being: keep the numbers, but make them mean
// something.
//
// Nine wave fields run at once, one per log-spaced frequency band. They
// share a single emitter but not a propagation speed: low bands travel slow
// and hang around, high bands race outward and die fast — which is what
// sound actually does in a room. So the bands separate across the plane on
// their own, by physics, rather than by being drawn in separate places.
//
// Then, per cell:
//   glyph size  = total energy passing through that point
//   digit 1–9   = *which band* dominates there
//
// That's the difference from K. In K the digit restates the height and
// carries nothing. Here a bassline and a sibilant are different characters
// in different regions: measured against synthetic sources, mean digit
// comes out at 2.2 for a bass note, 2.7 for a voice and 7.2 for a sibilant
// burst. How hard that separation is depends entirely on
// NORMALIZE_EXPONENT below, which is where the real design decision sits.
//
// The emitter isn't fixed either: it slides along the plane with the
// spectral centroid, so pitch steers where the ripples are born — a rising
// voice walks the source across the field.
//
// Cells keep their last dominant band once energy has passed through them,
// so after a phrase the grid still holds a map of where each frequency
// went. It reads as a record, which also means it survives as a still frame
// for an OG image or a digest card.

import { useEffect, useRef } from "react";
import { WaveField } from "./wave-field";
import { buildFontRamp, sizeStep } from "./glyph-grid";
import { logBandEdges, bandEnergies, spectralCentroid } from "./spectrum";
import type { FrequencyData } from "./use-audio-amplitude";
import { noise01 } from "./perlin";

type Props = {
  width: number;
  height: number;
  frequencyRef: React.MutableRefObject<FrequencyData>;
  /**
   * Simulation steps per rendered frame. 1 runs the medium at frame rate,
   * which against music read as frantic and out of time with the track.
   * Below 1 the medium advances on only some frames, bringing it back
   * near musical tempo.
   */
  tempoRef: React.MutableRefObject<number>;
  className?: string;
};

/** Glyph cell size in CSS px — the grid follows the frame's aspect. */
const CELL_PX = 12.3;
const BANDS = 9;
const SIZE_STEPS = 10;
const MIN_GLYPH = 3.5;
const MAX_GLYPH = 15;

/** Summed-across-bands height → normalized range. */
const GAIN = 0.5;
const INJECT_FLOOR = 0.05;
const INJECT_GAIN = 0.12;
/** Below this a cell keeps whichever band it last saw, instead of flickering. */
const DOMINANT_FLOOR = 0.02;
/**
 * A band whose strongest point on the whole plane is below this counts as
 * silent and is excluded from the comparison — otherwise a band carrying
 * nothing but noise wins cells purely because it's being normalized.
 */
const BAND_SILENCE = 0.004;
/**
 * …and the same guard in relative terms: a band peaking below this fraction
 * of the loudest band is out too. Without it a bass note still scatters 8s
 * and 9s into the corners, because out where the slow low bands haven't
 * arrived yet, the high bands' near-nothing is the largest thing present.
 * A bass note should not be drawing high-band digits.
 */
const BAND_RELATIVE_SILENCE = 0.05;
/**
 * How much of each band's own peak is divided out before the bands are
 * compared. This one number decides whether the piece means anything, and
 * both endpoints are broken:
 *
 *   0  — raw comparison. Speech has far more energy low, and the low bands
 *        are damped less on top of that, so bands 1–3 win every cell of
 *        every frame. Digits 5–9 never appear.
 *   1  — full normalization. Now only each band's *shape* competes, and
 *        shape is fixed by its speed and damping — which are constants. A
 *        bass note and a voice come out as the same picture (measured: 100%
 *        of cells identical). The visualization stops depending on the audio.
 *
 * 0.5 is the knee. Measured across a voice, a bass note and a sibilant
 * burst, mean digit lands at 2.7 / 2.2 / 7.2 and voice-vs-bass share 69% of
 * cells — same family, visibly different picture, which is the honest
 * answer since both really are low-band sounds.
 *
 * The cost: one sustained source only lights 4–5 of the nine digits. That's
 * correct rather than a bug — a bass note has no business drawing high-band
 * glyphs — but it does mean this reads as less busy than the original
 * sketch, whose digits varied everywhere precisely because they meant nothing.
 */
const NORMALIZE_EXPONENT = 0.5;
const IDLE_AMOUNT = 0.12;
/** How quickly the emitter chases the centroid. Low = it glides. */
const EMITTER_EASE = 0.1;
/**
 * Per-*second* decay for the lowest and highest band, converted to per-step
 * damping against the current tempo. Expressed this way so the tempo
 * control slows propagation without also stretching the ring-out — at fixed
 * per-step damping, halving the tempo doubles how long the plane sounds.
 * The spread is what carries the band separation: lows hang around, highs
 * are gone within a beat.
 */
const DECAY_LOW_PER_SECOND = 0.62;
const DECAY_HIGH_PER_SECOND = 0.18;
const FPS = 60;

export function WaveGridBands({
  width,
  height,
  frequencyRef,
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

    // One medium per band. Low bands: slow, lightly damped — they cross the
    // whole plane. High bands: quick, heavily damped — they stay near the
    // emitter and are gone within a beat. Damping is re-derived each frame
    // from the per-second targets, so it survives the tempo control.
    const waves: WaveField[] = [];
    const decayPerSecond = new Float32Array(BANDS);
    for (let b = 0; b < BANDS; b++) {
      const t = b / (BANDS - 1);
      decayPerSecond[b] =
        DECAY_LOW_PER_SECOND +
        t * (DECAY_HIGH_PER_SECOND - DECAY_LOW_PER_SECOND);
      waves.push(new WaveField(cols, rows, { speed: 0.14 + t * 0.32 }));
    }

    const energies = new Float32Array(BANDS);
    const peaks = new Float32Array(BANDS);
    const divisors = new Float32Array(BANDS);
    const steps = new Uint8Array(cols * rows);
    const dominant = new Uint8Array(cols * rows);
    const heights = new Float32Array(cols * rows);

    let edges = logBandEdges(frequencyRef.current.length || 128, BANDS);
    let edgesFor = frequencyRef.current.length;

    // Emitter starts dead centre and eases toward the centroid from there.
    let emitterCol = (cols - 1) / 2;
    const emitterRow = (rows - 1) / 2;
    let z = 0;
    let stepAcc = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function sample() {
      // Pass 1: each band's strongest point anywhere on the plane, which
      // sets what it gets partly normalized against. See
      // NORMALIZE_EXPONENT — this is the step that decides whether the
      // digits carry information.
      for (let b = 0; b < BANDS; b++) {
        const f = waves[b].field;
        let peak = 0;
        for (let i = 0; i < f.length; i++) {
          const m = f[i] < 0 ? -f[i] : f[i];
          if (m > peak) peak = m;
        }
        peaks[b] = peak;
      }

      let loudestPeak = 0;
      for (let b = 0; b < BANDS; b++) {
        if (peaks[b] > loudestPeak) loudestPeak = peaks[b];
      }
      const silenceFloor = Math.max(
        BAND_SILENCE,
        loudestPeak * BAND_RELATIVE_SILENCE,
      );
      for (let b = 0; b < BANDS; b++) {
        divisors[b] = Math.pow(peaks[b], NORMALIZE_EXPONENT);
      }

      // Pass 2: size from absolute energy, digit from partly-normalized
      // presence — "which band owns this point", not "which is loudest".
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          let sum = 0;
          let best = 0;
          let bestRel = 0;
          for (let b = 0; b < BANDS; b++) {
            const mag = Math.abs(waves[b].at(c, r));
            sum += mag;
            if (peaks[b] < silenceFloor) continue;
            const rel = mag / divisors[b];
            if (rel > bestRel) {
              bestRel = rel;
              best = b;
            }
          }
          // Only re-attribute a cell once real energy is present; otherwise
          // the argmax over nine near-zero fields is pure noise and the
          // digits strobe.
          if (sum > DOMINANT_FLOOR) dominant[i] = best;

          const idle = noise01(c * 0.16, r * 0.16, z) * IDLE_AMOUNT;
          const h = Math.min(1, sum * GAIN + idle);
          heights[i] = h;
          steps[i] = sizeStep(h, SIZE_STEPS);
        }
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      for (let s = 0; s < SIZE_STEPS; s++) {
        ctx.font = fonts[s];
        ctx.fillStyle = `rgba(245, 245, 245, ${0.2 + (s / (SIZE_STEPS - 1)) * 0.72})`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (steps[i] !== s) continue;
            const x = (c + 0.5) * cellW;
            const y = (r + 0.5) * cellH - heights[i] * cellH * 0.8;
            ctx.fillText(String(dominant[i] + 1), x, y);
          }
        }
      }
    }

    function tick() {
      const freq = frequencyRef.current;
      if (freq.length !== edgesFor) {
        edges = logBandEdges(freq.length, BANDS);
        edgesFor = freq.length;
      }
      bandEnergies(freq, edges, energies);

      // Pitch steers the source. `pow` spreads the low end, where speech
      // actually lives — a linear map would pin the emitter near one edge.
      const centroid = Math.pow(spectralCentroid(freq), 0.6);
      const margin = 3;
      const targetCol = margin + centroid * (cols - 1 - margin * 2);
      emitterCol += (targetCol - emitterCol) * EMITTER_EASE;

      // Advance the nine media at the requested rate rather than once per
      // frame. Injection rides inside the loop so energy and propagation
      // stay in step at any tempo.
      const tempo = Math.max(0.05, tempoRef.current);
      for (let b = 0; b < BANDS; b++) {
        waves[b].setDamping(
          Math.pow(decayPerSecond[b], 1 / (tempo * FPS)),
        );
      }
      stepAcc += tempo;
      let guard = 0;
      while (stepAcc >= 1 && guard++ < 8) {
        for (let b = 0; b < BANDS; b++) {
          if (energies[b] > INJECT_FLOOR) {
            waves[b].inject(
              emitterCol,
              emitterRow,
              energies[b] * INJECT_GAIN,
              2,
            );
          }
          waves[b].step();
        }
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
  }, [width, height, frequencyRef, tempoRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Wave grid visualizer, digits by frequency band"
      role="img"
    />
  );
}
