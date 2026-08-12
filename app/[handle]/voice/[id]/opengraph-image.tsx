// Voice-note share preview card (slice 39). Rendered at request time via
// Next's ImageResponse. The visual language reuses the "circle of points"
// motif from the animated mark on the tenant page and the reader — but
// static (ImageResponse doesn't run JS), so we place points along a
// noise-perturbed circle with fixed seed values.
//
// Not the same math as HUMAN_CIRCLE_DEFAULTS at runtime, because a
// server-rendered PNG can't call our client-only canvas code. The look
// is the same visual family — same colour, same density — without being
// literally the same frame.

import { ImageResponse } from "next/og";
import { userStore } from "@/lib/user-store";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = { w: 1200, h: 630 };
const CIRCLE_CX = 400;
const CIRCLE_CY = 315;
const BASE_R = 190;
const POINT_COUNT = 220;

// Deterministic pseudo-noise — enough variance so points read as a hand-
// wobbled circle rather than a perfect ring. Same seed → same shape,
// which is fine for a static OG.
function noise(a: number): number {
  return (
    Math.sin(a * 12.9898) * 0.5 +
    Math.sin(a * 78.233) * 0.3 +
    Math.sin(a * 137.5) * 0.2
  );
}

type Dot = { cx: number; cy: number; r: number; alpha: number };

function buildDots(): Dot[] {
  const dots: Dot[] = [];
  const step = (Math.PI * 2) / POINT_COUNT;
  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = i * step;
    const wobble = noise(angle);
    const r = BASE_R + wobble * 30;
    const cx = CIRCLE_CX + r * Math.cos(angle);
    const cy = CIRCLE_CY + r * Math.sin(angle);
    // Point size + alpha modulate slightly around the ring so the
    // outline reads as pencil-brush, not laser-cut.
    const size = 3 + Math.abs(noise(angle * 3.7)) * 3.5;
    const alpha = 0.4 + Math.abs(noise(angle * 5.1)) * 0.55;
    dots.push({ cx, cy, r: size, alpha });
  }
  return dots;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

type Props = {
  params: Promise<{ handle: string; id: string }>;
};

export default async function Image({ params }: Props) {
  const { handle, id } = await params;
  const user = await userStore.getByHandle(handle);
  const displayName = user?.displayName || handle;

  let durationLabel = "";
  if (user) {
    const entry = await store.getById(user.id, id);
    if (entry?.audio) {
      durationLabel = formatDuration(entry.audio.durationMs);
    }
  }

  const dots = buildDots();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#e4e4e7",
          padding: "80px 100px",
          alignItems: "center",
          gap: "80px",
        }}
      >
        {/* Circle-of-points visualization block. */}
        <div
          style={{
            display: "flex",
            position: "relative",
            width: CANVAS.w * 0.5,
            height: CANVAS.h,
            flexShrink: 0,
          }}
        >
          {dots.map((d, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: d.cx - d.r / 2,
                top: d.cy - d.r / 2,
                width: d.r,
                height: d.r,
                borderRadius: "9999px",
                background: `rgba(245, 245, 245, ${d.alpha})`,
              }}
            />
          ))}
          {/* Play glyph centered in the circle. */}
          <div
            style={{
              position: "absolute",
              left: CIRCLE_CX - 30,
              top: CIRCLE_CY - 40,
              width: 60,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e4e4e7",
              fontSize: 60,
            }}
          >
            {"▶"}
          </div>
        </div>

        {/* Text block. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "22px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "5px",
              fontFamily: "monospace",
            }}
          >
            Nearstream · Voice
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 400,
              lineHeight: 1.05,
              color: "#e4e4e7",
              letterSpacing: "-1.5px",
            }}
          >
            {displayName}
          </div>
          {durationLabel && (
            <div
              style={{
                fontSize: 32,
                color: "#a1a1aa",
                fontFamily: "monospace",
              }}
            >
              {durationLabel}
            </div>
          )}
          <div
            style={{
              fontSize: 24,
              color: "#71717a",
              lineHeight: 1.4,
              maxWidth: 500,
              marginTop: 10,
            }}
          >
            A voice note on a quieter web.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
