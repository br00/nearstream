// Discrete 2D wave equation on a fixed grid — the shared substrate for the
// "sound seen from above" candidates (K, L, M).
//
// This is the piece the Perlin-based candidates don't have: a *medium*.
// Perlin gives you a surface that undulates; a wave field gives you a
// surface that something travels across. Energy is injected at a point and
// then propagates, interferes with itself, reflects off the edges and
// decays — so the plane holds a short memory of what just happened rather
// than only reacting to the current frame.
//
// Standard explicit finite-difference scheme:
//
//   next = (2·cur − prev + c²·∇²cur) · damping
//
// The scheme is only stable while c² ≤ 0.5 on a unit-spaced square grid;
// past that it detonates into NaN within a second. `speed` is clamped
// accordingly rather than trusted.

export type WaveOpts = {
  /** Propagation speed as c². Clamped to the CFL stability limit (0.5). */
  speed?: number;
  /** Per-step energy retention. 1 = lossless, lower = the ripple dies sooner. */
  damping?: number;
};

const CFL_LIMIT = 0.5;

export class WaveField {
  readonly cols: number;
  readonly rows: number;

  private prev: Float32Array;
  private cur: Float32Array;
  private next: Float32Array;
  private readonly c2: number;
  private damping: number;

  constructor(cols: number, rows: number, opts: WaveOpts = {}) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.prev = new Float32Array(n);
    this.cur = new Float32Array(n);
    this.next = new Float32Array(n);
    this.c2 = Math.min(CFL_LIMIT, Math.max(0, opts.speed ?? 0.3));
    this.damping = Math.min(1, Math.max(0, opts.damping ?? 0.995));
  }

  /**
   * Retune the per-step decay.
   *
   * Damping is applied per *step*, not per second, so anything that changes
   * how often `step()` is called silently changes how long the medium rings
   * in wall-clock time. Halving the step rate to slow propagation doubles
   * the ring-out, which is how a tempo control quietly reintroduces the
   * phrase-smearing that the damping was chosen to avoid. Callers that vary
   * their step rate should hold a per-second decay target and convert:
   *
   *   setDamping(Math.pow(decayPerSecond, 1 / stepsPerSecond))
   */
  setDamping(damping: number): void {
    this.damping = Math.min(1, Math.max(0, damping));
  }

  /** Height at a cell. Unbounded — callers squash it into their own range. */
  at(col: number, row: number): number {
    return this.cur[row * this.cols + col];
  }

  /** The live height buffer, for callers that want to scan it directly. */
  get field(): Float32Array {
    return this.cur;
  }

  /**
   * Drop energy into the medium at a point, with a linear falloff over
   * `radius` cells. A single-cell impulse aliases badly at this grid
   * resolution — it reads as a flickering dot rather than a ripple leaving.
   */
  inject(col: number, row: number, energy: number, radius = 2): void {
    if (energy === 0) return;
    const c0 = Math.round(col);
    const r0 = Math.round(row);
    for (let dr = -radius; dr <= radius; dr++) {
      const r = r0 + dr;
      if (r < 1 || r >= this.rows - 1) continue;
      for (let dc = -radius; dc <= radius; dc++) {
        const c = c0 + dc;
        if (c < 1 || c >= this.cols - 1) continue;
        const d = Math.sqrt(dc * dc + dr * dr);
        if (d > radius) continue;
        this.cur[r * this.cols + c] += energy * (1 - d / (radius + 1));
      }
    }
  }

  /** Advance one timestep. */
  step(): void {
    const { cols, rows, cur, prev, next, c2, damping } = this;
    // The border ring stays pinned at zero, so waves reflect off the frame
    // instead of energy accumulating forever. Interior only.
    for (let r = 1; r < rows - 1; r++) {
      const row = r * cols;
      for (let c = 1; c < cols - 1; c++) {
        const i = row + c;
        const lap =
          cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols] - 4 * cur[i];
        next[i] = (2 * cur[i] - prev[i] + c2 * lap) * damping;
      }
    }
    // Rotate the three buffers rather than allocating — this runs 60×/sec
    // and, in the banded candidate, nine times per frame.
    this.prev = cur;
    this.cur = next;
    this.next = prev;
  }
}
