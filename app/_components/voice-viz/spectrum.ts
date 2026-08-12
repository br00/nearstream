// Spectrum helpers shared by the wave-field candidates.
//
// Both of these exist because the raw FFT is a bad thing to draw directly:
// bins are linear in frequency but hearing is roughly logarithmic, and the
// high bins of a voice carry an order of magnitude less energy than the low
// ones. Left untreated, nine-tenths of any visualization sits dark.

import type { FrequencyData } from "./use-audio-amplitude";

/**
 * Log-spaced bin boundaries for `bands` bands over `binCount` FFT bins.
 * Linear grouping would put most bands above 5kHz, where speech is nearly
 * silent. Recompute only when the bin count changes.
 */
export function logBandEdges(binCount: number, bands: number): number[] {
  const edges: number[] = [];
  for (let b = 0; b <= bands; b++) {
    edges.push(Math.floor(Math.pow(binCount, b / bands)) - 1);
  }
  return edges;
}

/**
 * Mean energy per band, 0–1, written into `out`.
 *
 * `tilt` lifts the upper bands to compensate for the natural spectral
 * roll-off — without it the top bands never move and the band identity
 * carries no information. Same correction the spectral-columns candidate
 * applies.
 */
export function bandEnergies(
  freq: FrequencyData,
  edges: number[],
  out: Float32Array,
  tilt = 1.6,
): void {
  const bands = out.length;
  for (let b = 0; b < bands; b++) {
    const lo = Math.max(0, edges[b]);
    const hi = Math.max(lo + 1, Math.min(freq.length, edges[b + 1] + 1));
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += freq[i];
    const avg = sum / (hi - lo) / 255;
    out[b] = Math.min(1, avg * (1 + (b / bands) * tilt));
  }
}

/**
 * Spectral centroid — the "centre of mass" of the spectrum, 0–1. This is
 * the closest honest proxy for perceived pitch/brightness available from a
 * byte FFT, and it's what moves the emitter: a low voice sits at one end of
 * the plane, a bright one at the other.
 *
 * Returns 0.5 in silence so the emitter parks in the middle rather than
 * snapping to an edge when nothing is playing.
 */
export function spectralCentroid(freq: FrequencyData): number {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < freq.length; i++) {
    weighted += i * freq[i];
    total += freq[i];
  }
  if (total < 1) return 0.5;
  return weighted / total / freq.length;
}
