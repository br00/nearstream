// Static frames of each visualizer, for surfaces that can't run canvas —
// OG share images and digest emails, both rendered server-side.
//
// These run the *real* simulations rather than drawing a lookalike. The
// wave equation (`wave-field.ts`) and the noise (`perlin.ts`) are plain
// modules with no browser dependency, so the server can step them exactly
// as the client does and read the positions out. The output is geometry —
// dots, lines, glyphs — which Satori can render as divs.
//
// Determinism matters twice over: `ImageResponse` runs per request, so a
// seeded PRNG is what stops the same voice note getting a different picture
// on every scrape. Nothing here calls `Math.random` or reads the clock.
//
// The cost of a new variant is a case in `staticVoiceViz` below. A variant
// without one renders nothing in link previews, which is why
// `lib/voice-viz-variants.ts` treats the static frame as mandatory.

import { WaveField } from "@/app/_components/voice-viz/wave-field";
import { noise01 } from "@/app/_components/voice-viz/perlin";
import { normalizeVoiceViz, type VoiceVizKey } from "@/lib/voice-viz-variants";

export type StaticDot = { x: number; y: number; r: number; alpha: number };
export type StaticLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
};
/** A continuous stroke — one agent's whole trail, as an SVG polyline. */
export type StaticPath = { points: [number, number][]; alpha: number; width: number };

export type StaticGlyph = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  char: string;
};

export type StaticVizFrame = {
  dots: StaticDot[];
  lines: StaticLine[];
  paths: StaticPath[];
  glyphs: StaticGlyph[];
};

/** Mulberry32 — small, fast, and identical run to run for a given seed. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A short synthetic phrase — speech, a pause, then a second burst. Gives
 * the simulations something with structure to respond to, so the still
 * shows a wave mid-travel rather than a flat or saturated plane.
 */
function envelopeAt(frame: number): number {
  if (frame < 26) return 0.55;
  if (frame < 40) return 0;
  if (frame < 58) return 0.42;
  return 0;
}

/** Nine synthetic bands weighted like a speaking voice: energy low, tapering. */
const VOICE_BANDS = [0.8, 0.9, 0.7, 0.5, 0.35, 0.25, 0.18, 0.12, 0.08];

export function staticVoiceViz(
  variant: unknown,
  width: number,
  height: number,
  seed = 1,
): StaticVizFrame {
  const key: VoiceVizKey = normalizeVoiceViz(variant);
  switch (key) {
    case "proximity-web":
      return staticProximityWeb(width, height, seed);
    case "wave-grid":
      return staticWaveGrid(width, height);
    case "ant-traces":
    default:
      return staticAntTraces(width, height, seed);
  }
}

// ── Ant traces ────────────────────────────────────────────────────────────
// Runs the real wave, walks the real agents, and keeps their whole path as
// a trail of dots — the still equivalent of the canvas's fading trails.

const ANT_CELL_PX = 5.7;

function staticAntTraces(
  width: number,
  height: number,
  seed: number,
): StaticVizFrame {
  const rng = makeRng(seed * 7919 + 13);
  const cols = Math.max(8, Math.round(width / ANT_CELL_PX));
  const rows = Math.max(8, Math.round(height / ANT_CELL_PX));
  const wave = new WaveField(cols, rows, { speed: 0.3, damping: 0.988 });
  const toGridX = cols / width;
  const toGridY = rows / height;

  const COUNT = Math.max(50, Math.min(130, Math.round(110 * (width / 620))));
  const ants = Array.from({ length: COUNT }, () => ({
    x: rng() * width,
    y: rng() * height,
    heading: rng() * Math.PI * 2,
  }));

  // Off-centre and off-lattice, matching the live component: a centred
  // source makes the contours concentric and the still reads as a ring.
  const emitX = cols * 0.42;
  const emitY = rows * 0.46;

  // One polyline per ant rather than a div per step. The div version cost
  // ~4000 rotated elements and 7.7s of Satori layout for a single card,
  // and still came out as detached dashes because each segment was its own
  // anti-aliased box. An SVG path is one element for a whole trail.
  const paths: StaticPath[] = [];
  const current: [number, number][][] = ants.map((a) => [[a.x, a.y]]);
  const FRAMES = 120;

  function flush(i: number, alpha: number) {
    if (current[i].length > 2) {
      paths.push({ points: current[i], alpha, width: 1.15 });
    }
    current[i] = [];
  }

  for (let f = 0; f < FRAMES; f++) {
    // Unlike the animation, the still can't rely on a live phrase — a
    // decayed medium leaves nothing to steer by and the trails come out as
    // aimless squiggles. Keep driving it, with a slow wobble so the
    // contours still change shape across the capture.
    const drive = 0.42 + 0.2 * Math.sin(f * 0.11);
    wave.inject(emitX, emitY, drive * 0.5, 3);
    wave.step();

    for (let i = 0; i < ants.length; i++) {
      const a = ants[i];
      const c = Math.min(cols - 2, Math.max(1, Math.round(a.x * toGridX)));
      const r = Math.min(rows - 2, Math.max(1, Math.round(a.y * toGridY)));
      const gx = wave.at(c + 1, r) - wave.at(c - 1, r);
      const gy = wave.at(c, r + 1) - wave.at(c, r - 1);
      const g = Math.sqrt(gx * gx + gy * gy);

      const desired = Math.atan2(gx, -gy);
      let diff = desired - a.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.heading += diff * Math.min(1, g * 9) * 0.4 + (rng() - 0.5) * 0.12;

      const speed = 0.5 + Math.min(1, g * 7) * (2.6 - 0.5);
      a.x += Math.cos(a.heading) * speed;
      a.y += Math.sin(a.heading) * speed;

      // Wrapping mid-stroke would draw a segment straight across the
      // frame, so end the trail at the seam and start a new one.
      let wrapped = false;
      if (a.x < 0) { a.x += width; wrapped = true; }
      else if (a.x > width) { a.x -= width; wrapped = true; }
      if (a.y < 0) { a.y += height; wrapped = true; }
      else if (a.y > height) { a.y -= height; wrapped = true; }

      if (wrapped) {
        flush(i, 0.28 + (f / FRAMES) * 0.4);
        current[i] = [[a.x, a.y]];
      } else if (f % 2 === 0) {
        current[i].push([a.x, a.y]);
      }
    }
  }
  for (let i = 0; i < ants.length; i++) flush(i, 0.75);

  return { dots: [], lines: [], paths, glyphs: [] };
}

// ── Proximity web ─────────────────────────────────────────────────────────
// Drifts the real nodes, then draws the links at a threshold matching a
// voice mid-sentence, so the still shows the web knitted rather than the
// scatter it collapses to in silence.

function staticProximityWeb(
  width: number,
  height: number,
  seed: number,
): StaticVizFrame {
  const rng = makeRng(seed * 104729 + 7);
  const NODE_COUNT = 58;
  const short = Math.min(width, height);
  const margin = short * 0.06;
  const minX = margin;
  const maxX = width - margin;
  const minY = margin;
  const maxY = height - margin;

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
    x: margin + rng() * (width - margin * 2),
    y: margin + rng() * (height - margin * 2),
    heading: rng() * Math.PI * 2,
    seed: i * 13.7,
  }));

  // Same specular bounce as the component — no positional force, so nodes
  // don't collect on an isosurface and the still stays evenly covered.
  let z = 0;
  const react = Math.pow(0.34, 0.6);
  const speed = 0.55 * (1 + react * 2.2);
  for (let f = 0; f < 420; f++) {
    for (const n of nodes) {
      n.heading += (noise01(n.seed, 0, z) - 0.5) * 0.22;
      n.x += Math.cos(n.heading) * speed;
      n.y += Math.sin(n.heading) * speed;
      if (n.x < minX) {
        n.x = minX + (minX - n.x);
        n.heading = Math.PI - n.heading;
      } else if (n.x > maxX) {
        n.x = maxX - (n.x - maxX);
        n.heading = Math.PI - n.heading;
      }
      if (n.y < minY) {
        n.y = minY + (minY - n.y);
        n.heading = -n.heading;
      } else if (n.y > maxY) {
        n.y = maxY - (n.y - maxY);
        n.heading = -n.heading;
      }
      n.x = Math.max(minX, Math.min(maxX, n.x));
      n.y = Math.max(minY, Math.min(maxY, n.y));
    }
    z += 0.004;
  }

  const threshold = short * (0.06 + react * (0.34 - 0.06));
  const lines: StaticLine[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d = Math.hypot(dx, dy);
      if (d >= threshold) continue;
      lines.push({
        x1: nodes[i].x,
        y1: nodes[i].y,
        x2: nodes[j].x,
        y2: nodes[j].y,
        alpha: Math.min(1, (1 - d / threshold) * (0.28 + react * 0.45) * 1.7),
      });
    }
  }

  const dots: StaticDot[] = nodes.map((n) => ({
    x: n.x,
    y: n.y,
    r: 1.6 + react * 1.1,
    alpha: 0.7 + react * 0.3,
  }));
  return { dots, lines, paths: [], glyphs: [] };
}

// ── Wave grid ─────────────────────────────────────────────────────────────
// Runs all nine band fields and reads out the same two mappings as the
// component: glyph size from total energy, digit from which band owns the
// point. Cells below the floor are dropped rather than drawn faint, which
// keeps the div count sane.

// Coarser than the animation's 12.3px. A still is read at a glance and
// from a link preview thumbnail, so it wants fewer, larger digits — the
// 1:1 cell size put ~1000 glyph divs on the card, which was both illegible
// at share size and three seconds of Satori layout.
const GRID_CELL_PX = 19;
const BANDS = 9;

function staticWaveGrid(width: number, height: number): StaticVizFrame {
  const cols = Math.max(4, Math.round(width / GRID_CELL_PX));
  const rows = Math.max(4, Math.round(height / GRID_CELL_PX));
  const cellW = width / cols;
  const cellH = height / rows;

  const waves: WaveField[] = [];
  for (let b = 0; b < BANDS; b++) {
    const t = b / (BANDS - 1);
    waves.push(new WaveField(cols, rows, { speed: 0.14 + t * 0.32 }));
  }
  // Per-second decay converted at the shipped tempo (0.6 steps/frame,
  // 60fps), so the still matches what the animation looks like.
  const stepsPerSecond = 0.6 * 60;
  for (let b = 0; b < BANDS; b++) {
    const t = b / (BANDS - 1);
    const perSecond = 0.62 + t * (0.18 - 0.62);
    waves[b].setDamping(Math.pow(perSecond, 1 / stepsPerSecond));
  }

  // Swept rather than guessed: at 74 steps the front hasn't reached the
  // corners (20 of 36 sample cells empty), and by 130 it has reflected off
  // the frame and cancelled itself in the middle, leaving a hollow centre.
  // 115 is the only value in the range that covers the whole frame.
  const STEPS = 115;
  const emitCol = cols * 0.5;
  const emitRow = (rows - 1) / 2;
  for (let f = 0; f < STEPS; f++) {
    const gate = envelopeAt(f) > 0 ? 1 : 0;
    for (let b = 0; b < BANDS; b++) {
      if (gate && VOICE_BANDS[b] > 0.05) {
        waves[b].inject(emitCol, emitRow, VOICE_BANDS[b] * 0.12, 2);
      }
      waves[b].step();
    }
  }

  const peaks = waves.map((w) => {
    let p = 0;
    for (const v of w.field) {
      const m = v < 0 ? -v : v;
      if (m > p) p = m;
    }
    return p;
  });
  const loudest = Math.max(...peaks);
  const silenceFloor = Math.max(0.004, loudest * 0.05);
  const divisors = peaks.map((p) => Math.pow(p, 0.5));

  const glyphs: StaticGlyph[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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
      const idle = noise01(c * 0.16, r * 0.16, 0.5) * 0.12;
      const h = Math.min(1, sum * 0.5 + idle);
      if (h < 0.17) continue;
      glyphs.push({
        x: (c + 0.5) * cellW,
        y: (r + 0.5) * cellH - h * cellH * 0.8,
        size: 7 + h * (20 - 7),
        alpha: 0.5 + h * 0.5,
        char: String(best + 1),
      });
    }
  }
  return { dots: [], lines: [], paths: [], glyphs };
}
