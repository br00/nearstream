"use client";

// Orbit swarm — every point rides its own tilted elliptical orbit around
// a common centre. Quiet, the system turns slowly and reads as one body;
// amplitude spins it up and stretches the orbits outward, so a loud
// passage looks like a system under strain. Short trails keep the paths
// legible without smearing into the flow-field's fog.

import { useEffect, useRef } from "react";
import { noise01 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Orbiter = {
  /** Orbit radius as a fraction of the half-size. */
  radiusFrac: number;
  angle: number;
  /** Radians per frame at idle; sign sets direction. */
  speed: number;
  /** Vertical squash of the ellipse (1 = circle). */
  squash: number;
  /** Fixed rotation of the ellipse's long axis. */
  tilt: number;
};

const ORBITER_COUNT = 150;
const TRAIL_FADE_ALPHA = 0.14; // shorter trails than the flow field
const DOT_SIZE = 1.6;

export function OrbitSwarm({ size, amplitudeRef, className }: Props) {
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

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);

    const orbiters: Orbiter[] = Array.from({ length: ORBITER_COUNT }, () => ({
      // Bias toward the outer half — a uniform radius draws a dense blob
      // at the centre that reads as noise rather than structure.
      radiusFrac: 0.18 + Math.sqrt(Math.random()) * 0.72,
      angle: Math.random() * Math.PI * 2,
      speed: (0.002 + Math.random() * 0.005) * (Math.random() < 0.5 ? -1 : 1),
      squash: 0.45 + Math.random() * 0.55,
      tilt: Math.random() * Math.PI,
    }));

    let z = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function draw(amp: number) {
      if (!ctx) return;
      const cx = size / 2;
      const cy = size / 2;
      const half = Math.min(cx, cy);
      ctx.fillStyle = `rgba(245, 245, 245, ${0.55 + amp * 0.4})`;

      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i];
        // Per-orbiter noise breathing so the ring never looks mechanical.
        const wobble = noise01(i * 0.37, 0, z) - 0.5;
        const r = half * o.radiusFrac * (1 + amp * 0.28 + wobble * 0.12);
        const ex = Math.cos(o.angle) * r;
        const ey = Math.sin(o.angle) * r * o.squash;
        const x = cx + ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt);
        const y = cy + ex * Math.sin(o.tilt) + ey * Math.cos(o.tilt);
        ctx.fillRect(x, y, DOT_SIZE, DOT_SIZE);
      }
    }

    function tick() {
      if (!ctx) return;
      const amp = amplitudeRef.current;
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE_ALPHA})`;
      ctx.fillRect(0, 0, size, size);

      draw(amp);

      const speedMul = 1 + amp * 4;
      for (const o of orbiters) o.angle += o.speed * speedMul;
      z += 0.004;
      raf = requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      draw(0);
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
      aria-label="Orbit swarm visualizer"
      role="img"
    />
  );
}
