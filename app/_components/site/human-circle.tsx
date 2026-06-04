"use client";

import { useEffect, useRef } from "react";

export type HumanCircleVariant =
  | "charcoal"
  | "ink"
  | "bristle"
  | "ephemeral"
  | "buildup";

type Props = {
  className?: string;
  variant?: HumanCircleVariant;
};

type Config = {
  /** Speed of pen progression. Higher = faster cycle. */
  speed: number;
  /** Max radial wobble as a fraction of the radius. */
  errorScale: number;
  /** Closing-gap angle (radians) at the top. */
  gapBase: number;
  gapJitter: number;
  /** Pause (in t units) between attempts. */
  pause: number;
  /** Stroke width in CSS px. */
  lineWidth: number;
  /** Stroke colour. */
  stroke: string;
  /** Optional shadow blur for fuzzy edges. */
  shadowBlur?: number;
  shadowColor?: string;
  /** How many stacked sub-strokes per segment (for brush feel). */
  subStrokes?: number;
  subStrokeJitter?: number;
  /** Per-frame fade alpha. 0 = no fade (cleared each cycle). >0 = buildup. */
  fadeAlpha: number;
  /** If true, fade aggressively after the cycle completes (ephemeral). */
  ephemeralFade?: number;
};

const VARIANTS: Record<HumanCircleVariant, Config> = {
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

export function HumanCircle({ className, variant = "charcoal" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = VARIANTS[variant];
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

    let raf = 0;
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

      // Decide what kind of "background frame" to lay down.
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
        // Cycle complete. For variants that clear, wait then clear. For
        // ephemeral, dissolve until canvas is black-ish before restarting.
        if (!phaseDone) {
          phaseDone = true;
          cycleStart = t;
        }
        if (phase - total >= cfg.pause) {
          // Restart.
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
        raf = requestAnimationFrame(tick);
        return;
      }

      const angle = -Math.PI / 2 + (gap / 2) + phase * Math.PI * 2;
      const { x, y } = point(angle, r, cx, cy);

      // Taper the ends — the first and last few percent get thinner.
      const edgeFade = Math.min(phase / 0.05, (total - phase) / 0.05, 1);
      const alpha = Math.max(0.25, edgeFade);

      if (prevX !== null && prevY !== null) {
        drawSegment({ x: prevX, y: prevY }, { x, y }, alpha);
      }

      prevX = x;
      prevY = y;
      raf = requestAnimationFrame(tick);
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
      raf = requestAnimationFrame(tick);
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
