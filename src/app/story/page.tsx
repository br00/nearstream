"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "../components/logo";

function StoryParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match the viewport exactly
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let animationId: number;
    const w = rect.width;
    const h = rect.height;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
    }

    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 2 + 0.5,
      baseAlpha: Math.random() * 0.35 + 0.08,
    }));

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const alpha =
          p.baseAlpha + Math.sin(Date.now() * 0.0006 + p.x * 0.01) * 0.06;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx!.fill();

        if (p.radius > 1.5) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha * 0.07})`;
          ctx!.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas className="absolute inset-0 w-full h-full" ref={canvasRef} />
  );
}

export default function Story() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <StoryParticles />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center">
        {/* Logo mark + wordmark */}
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={56} />
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-foreground">
            Nearstream
          </span>
        </div>

        {/* Main message */}
        <p className="mt-10 text-base font-normal leading-relaxed text-foreground">
          I&rsquo;m stepping off
          <br />
          Instagram.
        </p>

        <p className="mt-5 text-xs leading-relaxed text-muted max-w-[200px]">
          I&rsquo;m building a quieter way to share with the people I actually know.
        </p>

        {/* Divider dot */}
        <span className="mt-6 inline-block h-0.5 w-0.5 rounded-full bg-foreground/30" />

        {/* Tagline */}
        <p className="mt-6 text-xs text-muted/40">
          No algorithm. No public. Just us.
        </p>

        {/* Link hint */}
        <p className="mt-12 font-mono text-[9px] text-muted/25 tracking-wider">
          link in bio &darr;
        </p>
      </div>
    </div>
  );
}
