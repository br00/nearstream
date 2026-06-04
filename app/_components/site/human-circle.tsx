"use client";

import { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

export type HumanCircleVariant =
  | "movingpoints"
  | "charcoal"
  | "ink"
  | "bristle"
  | "ephemeral"
  | "buildup";

type Props = {
  className?: string;
  variant?: HumanCircleVariant;
};

export function HumanCircle({ className, variant = "movingpoints" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const noise3D = createNoise3D();

    // Convert simplex-noise's [-1, 1] output to Processing's [0, 1] noise() output.
    const n01 = (x: number, y: number, z: number) =>
      (noise3D(x, y, z) + 1) * 0.5;

    let raf = 0;

    if (variant === "movingpoints") {
      runMovingPoints(canvas, ctx, n01, prefersReducedMotion, (id) => (raf = id));
    } else {
      runStrokeVariant(canvas, ctx, variant, prefersReducedMotion, (id) => (raf = id));
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Human circle — an animated signature by Alessandro Borelli"
      role="img"
    />
  );
}

// -------------------------------------------------------------------------
// "moving points" — faithful port of Alessandro's pencilBrush sketch.
// A noise-perturbed circle traced as ~600 small pencil-brush blobs. Each
// brush mark is itself a noisy closed shape. Animation evolves the noise
// over a slow z-axis drift.
// -------------------------------------------------------------------------
function runMovingPoints(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  noise: (x: number, y: number, z: number) => number,
  prefersReducedMotion: boolean,
  setRaf: (id: number) => void,
) {
  // Tunables — mirror the Processing sketch's constants, scaled by canvas size.
  const N_MAX = 0.45;            // noise input range for macro-circle (Processing: nMax)
  const ANGLE_STEP = 0.018;      // ~349 brush marks per circle (Processing: 0.01 → 628; we go a bit sparser for perf)
  const BRUSH_ANGLE_STEP = 0.18; // ~35 verts per brush blob (Processing: 0.1 → 63)
  const BRUSH_NOISE_RANGE = 15;
  const SEED_SPEED = 0.0024;     // per-frame z-axis drift — controls morphing pace
  const BASE_RADIUS_FRAC = 0.30; // mean radius as fraction of half-canvas (Processing: 150 / 400)
  const RADIUS_RANGE_FRAC = 0.10; // wobble range as fraction of half-canvas

  let z = 0;

  function frame() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const half = Math.min(cx, cy);
    const radiusBase = half * BASE_RADIUS_FRAC;
    const radiusRange = half * RADIUS_RANGE_FRAC;
    // Brush size scales gently with canvas so it doesn't look chunky at large sizes.
    const brushScale = half / 220;

    // Re-paint the whole circle each frame. Black background, then brush marks.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    for (let a = 0; a < Math.PI * 2; a += ANGLE_STEP) {
      const xoff = mapTo(Math.cos(a), -1, 1, 0, N_MAX);
      const yoff = mapTo(Math.sin(a), -1, 1, 0, N_MAX);
      const n = noise(xoff, yoff, z);
      const r = mapTo(n, 0, 1, radiusBase, radiusBase + radiusRange * 2);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);

      pencilBrush(ctx, noise, x, y, Math.cos(a), brushScale, z);
    }

    z += SEED_SPEED;
    setRaf(requestAnimationFrame(frame));
  }

  if (prefersReducedMotion) {
    // One static frame, no animation loop.
    frame();
    // Don't schedule next frame.
    return;
  }

  setRaf(requestAnimationFrame(frame));
}

function pencilBrush(
  ctx: CanvasRenderingContext2D,
  noise: (x: number, y: number, z: number) => number,
  x1: number,
  y1: number,
  inc: number,
  brushScale: number,
  z: number,
) {
  // Alpha modulated by position on the circle — one side of the ring is
  // brighter than the other. Matches the Processing sketch's `fill(245,
  // map(inc, -1, 1, 100, 160))`.
  const alpha = mapTo(inc, -1, 1, 100, 160) / 255;
  ctx.fillStyle = `rgba(245, 245, 245, ${alpha})`;

  // Build a noisy closed shape — the brush mark itself isn't a circle.
  ctx.beginPath();
  let first = true;
  for (let a = 0; a < Math.PI * 2; a += 0.18) {
    const xoff = mapTo(Math.cos(a), -1, 1, 0, 15);
    const yoff = mapTo(Math.sin(a), -1, 1, 0, 15);
    // Sample brush noise in a separate octave (offset z by 100) so it doesn't
    // resonate with the macro-circle's noise. The brush itself doesn't morph
    // with z — only the macro circle does.
    const r = mapTo(noise(xoff, yoff, 100), 0, 1, 1, 3) * brushScale;
    const bx = r * Math.cos(a);
    const by = r * Math.sin(a);
    if (first) {
      ctx.moveTo(x1 - bx, y1 - by);
      first = false;
    } else {
      ctx.lineTo(x1 - bx, y1 - by);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function mapTo(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

// -------------------------------------------------------------------------
// Stroke variants from the previous iteration — kept so the preview page
// can still show them. Each is a single pen-traced circle with different
// stroke characteristics. Not the production default.
// -------------------------------------------------------------------------

type StrokeVariant = Exclude<HumanCircleVariant, "movingpoints">;

type StrokeConfig = {
  speed: number;
  errorScale: number;
  gapBase: number;
  gapJitter: number;
  pause: number;
  lineWidth: number;
  stroke: string;
  shadowBlur?: number;
  shadowColor?: string;
  subStrokes?: number;
  subStrokeJitter?: number;
  fadeAlpha: number;
  ephemeralFade?: number;
};

const STROKE_CONFIGS: Record<StrokeVariant, StrokeConfig> = {
  charcoal: {
    speed: 0.0018,
    errorScale: 0.025,
    gapBase: 0.08,
    gapJitter: 0.04,
    pause: 0.4,
    lineWidth: 7,
    stroke: "rgba(228, 228, 231, 0.18)",
    fadeAlpha: 0,
  },
  ink: {
    speed: 0.0022,
    errorScale: 0.022,
    gapBase: 0.07,
    gapJitter: 0.04,
    pause: 0.35,
    lineWidth: 3.5,
    stroke: "rgba(228, 228, 231, 0.45)",
    shadowBlur: 6,
    shadowColor: "rgba(228, 228, 231, 0.35)",
    fadeAlpha: 0,
  },
  bristle: {
    speed: 0.0020,
    errorScale: 0.025,
    gapBase: 0.07,
    gapJitter: 0.05,
    pause: 0.35,
    lineWidth: 1.2,
    stroke: "rgba(228, 228, 231, 0.22)",
    subStrokes: 6,
    subStrokeJitter: 4,
    fadeAlpha: 0,
  },
  ephemeral: {
    speed: 0.0024,
    errorScale: 0.022,
    gapBase: 0.08,
    gapJitter: 0.04,
    pause: 1.2,
    lineWidth: 6,
    stroke: "rgba(228, 228, 231, 0.22)",
    fadeAlpha: 0,
    ephemeralFade: 0.04,
  },
  buildup: {
    speed: 0.0028,
    errorScale: 0.05,
    gapBase: 0.04,
    gapJitter: 0.04,
    pause: 0.05,
    lineWidth: 1,
    stroke: "rgba(228, 228, 231, 0.5)",
    fadeAlpha: 0.025,
  },
};

function runStrokeVariant(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  variant: StrokeVariant,
  prefersReducedMotion: boolean,
  setRaf: (id: number) => void,
) {
  const cfg = STROKE_CONFIGS[variant];
  let t = 0;
  let cycleStart = 0;
  let seedA = Math.random() * 1000;
  let seedB = Math.random() * 1000;
  let seedC = Math.random() * 1000;
  let gap = cfg.gapBase + Math.random() * cfg.gapJitter;
  let phaseDone = false;
  let prevX: number | null = null;
  let prevY: number | null = null;

  function noiseAt(angle: number): number {
    const f = 2.2;
    return (
      Math.sin(angle * f + seedA) * 0.55 +
      Math.sin(angle * f * 1.9 + seedB) * 0.3 +
      Math.sin(angle * f * 3.7 + seedC) * 0.15
    );
  }

  function point(angle: number, r: number, cx: number, cy: number) {
    const wobble = noiseAt(angle) * cfg.errorScale * r;
    const rNoisy = r + wobble;
    return {
      x: cx + Math.cos(angle) * rNoisy,
      y: cy + Math.sin(angle) * rNoisy,
    };
  }

  function drawSegment(
    from: { x: number; y: number },
    to: { x: number; y: number },
    alpha: number,
  ) {
    if (!ctx) return;
    ctx.strokeStyle = cfg.stroke;
    ctx.lineWidth = cfg.lineWidth * alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (cfg.shadowBlur && cfg.shadowColor) {
      ctx.shadowBlur = cfg.shadowBlur;
      ctx.shadowColor = cfg.shadowColor;
    } else {
      ctx.shadowBlur = 0;
    }

    const subN = cfg.subStrokes ?? 1;
    const jitter = cfg.subStrokeJitter ?? 0;

    for (let i = 0; i < subN; i++) {
      const ox = subN > 1 ? (Math.random() - 0.5) * jitter : 0;
      const oy = subN > 1 ? (Math.random() - 0.5) * jitter : 0;
      ctx.beginPath();
      ctx.moveTo(from.x + ox, from.y + oy);
      ctx.lineTo(to.x + ox, to.y + oy);
      ctx.stroke();
    }
  }

  function tick() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) * 0.68;

    if (cfg.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${cfg.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else if (cfg.ephemeralFade && phaseDone) {
      ctx.fillStyle = `rgba(0, 0, 0, ${cfg.ephemeralFade})`;
      ctx.fillRect(0, 0, w, h);
    }

    t += cfg.speed;
    const phase = t - cycleStart;
    const total = 1 - gap;

    if (phase >= total) {
      if (!phaseDone) {
        phaseDone = true;
        cycleStart = t;
      }
      if (phase - total >= cfg.pause) {
        if (!cfg.fadeAlpha && !cfg.ephemeralFade) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);
        }
        cycleStart = t + 0.01;
        seedA = Math.random() * 1000;
        seedB = Math.random() * 1000;
        seedC = Math.random() * 1000;
        gap = cfg.gapBase + Math.random() * cfg.gapJitter;
        prevX = null;
        prevY = null;
        phaseDone = false;
      }
      setRaf(requestAnimationFrame(tick));
      return;
    }

    const angle = -Math.PI / 2 + gap / 2 + phase * Math.PI * 2;
    const { x, y } = point(angle, r, cx, cy);

    const edgeFade = Math.min(phase / 0.05, (total - phase) / 0.05, 1);
    const alpha = Math.max(0.25, edgeFade);

    if (prevX !== null && prevY !== null) {
      drawSegment({ x: prevX, y: prevY }, { x, y }, alpha);
    }

    prevX = x;
    prevY = y;
    setRaf(requestAnimationFrame(tick));
  }

  if (prefersReducedMotion) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) * 0.68;
    let p: { x: number; y: number } | null = null;
    const steps = 360;
    const startAngle = -Math.PI / 2 + gap / 2;
    const endAngle = startAngle + (1 - gap) * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * (endAngle - startAngle);
      const pt = point(a, r, cx, cy);
      if (p) drawSegment(p, pt, 1);
      p = pt;
    }
  } else {
    setRaf(requestAnimationFrame(tick));
  }
}

