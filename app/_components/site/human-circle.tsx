"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  /** Speed of the pen tracing — higher = faster cycles. */
  speed?: number;
  /** Maximum noise displacement as a fraction of the radius. */
  errorScale?: number;
  /** How quickly the canvas fades old strokes (0 = no fade, 1 = instant clear). */
  fadeAlpha?: number;
};

/**
 * "Human circle" — a port of Alessandro's moving.points piece. A machine
 * attempts to draw a circle, starting from a perfect parametric one, and
 * adds human-feeling errors. Each cycle is a new attempt; old attempts fade
 * gradually so the canvas accumulates density over time.
 */
export function HumanCircle({
  className,
  speed = 0.0028,
  errorScale = 0.06,
  fadeAlpha = 0.025,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Resize canvas to its container, accounting for devicePixelRatio.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Reset to fully black on resize so the trail doesn't keep an old aspect.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Animation state.
    let raf = 0;
    let t = 0;
    let cycleStart = 0;
    let seedA = Math.random() * 1000;
    let seedB = Math.random() * 1000;
    let seedC = Math.random() * 1000;
    // The closing gap — sometimes the machine almost meets the start, sometimes not.
    let closingGap = 0.02 + Math.random() * 0.04;
    let prevX: number | null = null;
    let prevY: number | null = null;

    function pointAt(angle: number, r: number, cx: number, cy: number) {
      // Three octaves of sine-based pseudo-noise. Crude but produces an
      // organic wobble distinct from pure randomness.
      const noiseFreq = 3.3;
      const noise =
        Math.sin(angle * noiseFreq + seedA) * 0.5 +
        Math.sin(angle * noiseFreq * 2.1 + seedB) * 0.3 +
        Math.sin(angle * noiseFreq * 4.7 + seedC) * 0.2;
      const rNoisy = r * (1 + noise * errorScale);
      return {
        x: cx + Math.cos(angle) * rNoisy,
        y: cy + Math.sin(angle) * rNoisy,
      };
    }

    function tick() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) * 0.68;

      // Fade the previous frame slightly (translucent black overlay).
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      t += speed;
      const phase = t - cycleStart;
      const total = 1 - closingGap;

      if (phase >= total) {
        // End of attempt — pause a beat, then start new attempt with new seeds.
        cycleStart = t + 0.04;
        seedA = Math.random() * 1000;
        seedB = Math.random() * 1000;
        seedC = Math.random() * 1000;
        closingGap = 0.02 + Math.random() * 0.05;
        prevX = null;
        prevY = null;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (phase < 0) {
        // Brief inter-cycle pause.
        raf = requestAnimationFrame(tick);
        return;
      }

      const angle = -Math.PI / 2 + phase * Math.PI * 2;
      const { x, y } = pointAt(angle, r, cx, cy);

      if (prevX !== null && prevY !== null) {
        ctx.strokeStyle = "rgba(228, 228, 231, 0.55)";
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      prevX = x;
      prevY = y;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      // Draw a single static attempt instead of animating.
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) * 0.68;
      ctx.strokeStyle = "rgba(228, 228, 231, 0.65)";
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const a = -Math.PI / 2 + (i / 360) * Math.PI * 2;
        const { x, y } = pointAt(a, r, cx, cy);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [speed, errorScale, fadeAlpha]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Human circle — an animated signature by Alessandro Borelli"
      role="img"
    />
  );
}
