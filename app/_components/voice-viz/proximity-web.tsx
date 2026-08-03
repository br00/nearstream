"use client";

// Proximity web — drifting points that draw a line to any neighbour
// within a threshold distance. Amplitude raises the threshold, so silence
// is a scatter of unconnected points and speech knits them into a web.
// The one candidate whose *meaning* matches Nearstream: a voice is what
// connects people who were otherwise just near each other.

import { useEffect, useRef } from "react";
import { noise01 } from "./perlin";

type Props = {
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Node = { x: number; y: number; seed: number };

const NODE_COUNT = 58; // O(n²) pairs per frame — 1653 checks, cheap enough
const DRIFT = 0.55; // px per frame at idle
const LINK_MIN_FRAC = 0.13; // threshold at silence, as a fraction of size
const LINK_MAX_FRAC = 0.34; // threshold at full amplitude

export function ProximityWeb({ size, amplitudeRef, className }: Props) {
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

    const margin = size * 0.06;
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: margin + Math.random() * (size - margin * 2),
      y: margin + Math.random() * (size - margin * 2),
      seed: i * 13.7,
    }));

    let z = 0;
    let raf = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function draw(amp: number) {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      const threshold =
        size * (LINK_MIN_FRAC + amp * (LINK_MAX_FRAC - LINK_MIN_FRAC));
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d >= threshold) continue;
          // Fade the link in as the pair closes — a hard cutoff makes
          // lines pop in and out and reads as flicker.
          const alpha = (1 - d / threshold) * (0.28 + amp * 0.45);
          ctx.strokeStyle = `rgba(245, 245, 245, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = `rgba(245, 245, 245, ${0.7 + amp * 0.3})`;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      const amp = amplitudeRef.current;
      const speed = DRIFT * (1 + amp * 2.2);

      for (const n of nodes) {
        // Independent noise per node for heading — keeps the drift
        // organic without a shared field pulling them all one way.
        const angle = noise01(n.seed, 0, z) * Math.PI * 4;
        n.x += Math.cos(angle) * speed;
        n.y += Math.sin(angle) * speed;
        // Bounce rather than wrap: a link crossing the wrap seam would
        // draw a long line straight across the canvas.
        if (n.x < margin || n.x > size - margin) {
          n.x = Math.max(margin, Math.min(size - margin, n.x));
          n.seed += 100;
        }
        if (n.y < margin || n.y > size - margin) {
          n.y = Math.max(margin, Math.min(size - margin, n.y));
          n.seed += 100;
        }
      }

      draw(amp);
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
      aria-label="Proximity web visualizer"
      role="img"
    />
  );
}
