"use client";

// Proximity web — drifting points that draw a line to any neighbour
// within a threshold distance. Amplitude raises the threshold, so silence
// is a scatter of unconnected points and speech knits them into a web.
// The one candidate whose *meaning* matches Nearstream: a voice is what
// connects people who were otherwise just near each other.

import { useEffect, useRef } from "react";
import { noise01 } from "./perlin";

type Props = {
  width: number;
  height: number;
  amplitudeRef: React.MutableRefObject<number>;
  className?: string;
};

type Node = { x: number; y: number; seed: number };

const NODE_COUNT = 58; // O(n²) pairs per frame — 1653 checks, cheap enough
const DRIFT = 0.55; // px per frame at idle
/**
 * Link threshold at silence, as a fraction of the frame's short side. Was
 * 0.13, which left ~160 links already drawn with nothing playing — the web
 * was permanently knitted, so speech could only make a dense thing denser.
 * The piece reads as reactive because of the *contrast*, so silence has to
 * be genuinely sparse. Measured: silence 63 links, normal speech 403.
 */
const LINK_MIN_FRAC = 0.06;
const LINK_MAX_FRAC = 0.34; // threshold at full amplitude
/**
 * Amplitude response curve. Normal speech only produces ~0.3 from the
 * analyser (shouting is what reaches 1.0), so a linear map spends most of
 * its range on levels that never occur. This lifts conversational level
 * into the middle of the range where it belongs.
 */
const AMP_CURVE = 0.6;
/** Where the inward steering starts, as a fraction of the way to the wall. */
const EDGE_SOFT = 0.55;
const EDGE_FORCE = 2.5;

export function ProximityWeb({ width, height, amplitudeRef, className }: Props) {
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

    // Thresholds scale off the short side so a wide frame doesn't turn the
    // whole thing into one solid mesh.
    const short = Math.min(width, height);
    const margin = short * 0.06;
    const halfW = width / 2;
    const halfH = height / 2;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
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
      ctx.fillRect(0, 0, width, height);

      const react = Math.pow(amp, AMP_CURVE);
      const threshold =
        short * (LINK_MIN_FRAC + react * (LINK_MAX_FRAC - LINK_MIN_FRAC));
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d >= threshold) continue;
          // Fade the link in as the pair closes — a hard cutoff makes
          // lines pop in and out and reads as flicker.
          const alpha = (1 - d / threshold) * (0.28 + react * 0.45);
          ctx.strokeStyle = `rgba(245, 245, 245, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = `rgba(245, 245, 245, ${0.7 + react * 0.3})`;
      const dotR = 1.6 + react * 1.1;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      const amp = amplitudeRef.current;
      const react = Math.pow(amp, AMP_CURVE);
      const speed = DRIFT * (1 + react * 2.2);

      for (const n of nodes) {
        // Independent noise per node for heading — keeps the drift
        // organic without a shared field pulling them all one way.
        const angle = noise01(n.seed, 0, z) * Math.PI * 4;
        let vx = Math.cos(angle);
        let vy = Math.sin(angle);

        // Steer inward before the wall rather than clamping at it. The old
        // clamp left 12–17% of nodes pinned flat against the border at any
        // moment, sliding along it until their noise heading happened to
        // turn them around — which is what read as the web sitting off to
        // one side. With this the measured figure is 0%.
        const bx = (halfW - n.x) / halfW;
        const by = (halfH - n.y) / halfH;
        const edge = Math.max(Math.abs(bx), Math.abs(by));
        if (edge > EDGE_SOFT) {
          const pull = Math.pow((edge - EDGE_SOFT) / (1 - EDGE_SOFT), 2);
          vx += bx * pull * EDGE_FORCE;
          vy += by * pull * EDGE_FORCE;
          const len = Math.hypot(vx, vy) || 1;
          vx /= len;
          vy /= len;
        }

        n.x += vx * speed;
        n.y += vy * speed;
        // Backstop only — the steering above should keep this from firing.
        n.x = Math.max(margin, Math.min(width - margin, n.x));
        n.y = Math.max(margin, Math.min(height - margin, n.y));
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
  }, [width, height, amplitudeRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Proximity web visualizer"
      role="img"
    />
  );
}
