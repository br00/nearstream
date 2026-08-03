"use client";

// Dot-matrix pulse — a fixed grid of dots whose *radius* is the only
// thing that moves. Amplitude onsets (not levels) spawn a ring that
// expands outward from the centre; dots swell as the ring crosses them,
// then settle. Closest of the set to the Nothing-Phone glyph language:
// nothing drifts, nothing trails, the grid just breathes on attack.

import { useEffect, useRef } from "react";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Pulse = {
  /** Current ring radius in px. */
  r: number;
  /** 0–1, decays as the ring travels. */
  strength: number;
};

const GRID = 17; // odd, so one dot sits exactly on centre
const PULSE_SPEED = 2.6; // px per frame
const PULSE_DECAY = 0.985;
const RING_WIDTH = 26; // px — how wide the swell band is
// An onset is a rise of this much over the smoothed level. Level-based
// triggering fires continuously through a held note; rise-based fires
// once per syllable, which is what makes this read as speech.
const ONSET_DELTA = 0.09;
const ONSET_COOLDOWN_FRAMES = 8;
const MAX_PULSES = 8;

export function DotMatrixPulse({ size, amplitudeRef, className }: Props) {
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

    const margin = size * 0.1;
    const step = (size - margin * 2) / (GRID - 1);
    const maxRadius = step * 0.4;
    const cx = size / 2;
    const cy = size / 2;

    // Precompute each dot's position + distance from centre once.
    const dots: { x: number; y: number; dist: number }[] = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x = margin + gx * step;
        const y = margin + gy * step;
        dots.push({ x, y, dist: Math.hypot(x - cx, y - cy) });
      }
    }

    const pulses: Pulse[] = [];
    let smoothed = 0;
    let cooldown = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function draw(amp: number) {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = `rgba(245, 245, 245, ${0.62 + amp * 0.3})`;

      for (const d of dots) {
        let swell = 0;
        for (const p of pulses) {
          const band = Math.abs(d.dist - p.r);
          if (band < RING_WIDTH) {
            // Cosine falloff across the band — smoother than linear and
            // avoids a visible hard edge on the leading side.
            swell +=
              p.strength * (Math.cos((band / RING_WIDTH) * Math.PI) * 0.5 + 0.5);
          }
        }
        const r = maxRadius * (0.18 + Math.min(1, swell) * 0.82);
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      const amp = amplitudeRef.current;

      if (cooldown > 0) cooldown--;
      if (amp - smoothed > ONSET_DELTA && cooldown === 0) {
        if (pulses.length >= MAX_PULSES) pulses.shift();
        pulses.push({ r: 0, strength: Math.min(1, amp) });
        cooldown = ONSET_COOLDOWN_FRAMES;
      }
      smoothed += (amp - smoothed) * 0.12;

      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].r += PULSE_SPEED;
        pulses[i].strength *= PULSE_DECAY;
        if (pulses[i].r > size || pulses[i].strength < 0.02) pulses.splice(i, 1);
      }

      draw(amp);
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
      aria-label="Dot matrix pulse visualizer"
      role="img"
    />
  );
}
