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

/**
 * `heading` is state, not something recomputed each frame. That's the whole
 * trick for staying evenly spread: a node with momentum bounces off a wall
 * and leaves. Deriving an absolute heading from noise every frame instead
 * gives nodes no memory, so *any* boundary handling turns into a trap —
 * a hard clamp pins them to the wall, and an inward force pins them to the
 * isosurface where that force kicks in. Both were shipped and both showed
 * up as the web sitting off to one side.
 */
type Node = { x: number; y: number; heading: number; seed: number };

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
/**
 * How fast a node's heading curves, in radians per frame at full swing.
 * Noise *nudges* the stored heading rather than replacing it, so paths
 * stay smooth and momentum survives a bounce.
 */
const WANDER_RATE = 0.22;

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
    const minX = margin;
    const maxX = width - margin;
    const minY = margin;
    const maxY = height - margin;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
      heading: Math.random() * Math.PI * 2,
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
        // Independent noise per node, curving the heading it already has.
        // Continuous in z, so paths arc rather than jitter.
        n.heading += (noise01(n.seed, 0, z) - 0.5) * WANDER_RATE;
        n.x += Math.cos(n.heading) * speed;
        n.y += Math.sin(n.heading) * speed;

        // Specular bounce — reflect both the position and the heading, the
        // way a ball leaves a cushion. No positional force anywhere, so
        // there's no isosurface for nodes to accumulate on and the interior
        // stays evenly covered.
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
        // Backstop for a pathological overshoot; shouldn't fire.
        n.x = Math.max(minX, Math.min(maxX, n.x));
        n.y = Math.max(minY, Math.min(maxY, n.y));
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
