// Voice-note share preview card (slice 39). Rendered at request time via
// Next's ImageResponse.
//
// The panel shows the *author's* chosen visualizer, so a shared link looks
// like their voice notes do everywhere else. ImageResponse can't run
// canvas, but the simulations themselves are plain modules — so
// `lib/voice-viz-static.ts` steps the real wave equation server-side and
// hands back geometry, which Satori lays out as divs. Same math as the
// animation, one frozen frame of it.
//
// The frame is seeded from the entry id: stable across scrapes and
// re-renders, but two different voice notes don't get the same picture.

import { ImageResponse } from "next/og";
import { userStore } from "@/lib/user-store";
import { store } from "@/lib/store";
import { normalizeVoiceViz } from "@/lib/voice-viz-variants";
import { staticVoiceViz } from "@/lib/voice-viz-static";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = { w: 1200, h: 630 };
/** Left half of the card, matching the layout below. */
const PANEL = { w: CANVAS.w * 0.5, h: CANVAS.h };

/** Stable per-entry seed so a given voice note always renders the same. */
function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000 || 1;
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

  const variant = normalizeVoiceViz(user?.preferences?.voiceViz);
  const frame = staticVoiceViz(variant, PANEL.w, PANEL.h, seedFrom(id));

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
            overflow: "hidden",
            width: PANEL.w,
            height: PANEL.h,
            flexShrink: 0,
          }}
        >
          {/* One SVG for all the geometry. Satori lays out a single
              element here instead of thousands of positioned divs — for
              the trail-based variants that is the difference between a
              sub-second card and an eight-second one. */}
          <svg
            width={PANEL.w}
            height={PANEL.h}
            viewBox={`0 0 ${PANEL.w} ${PANEL.h}`}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {frame.paths.map((p, i) => (
              <polyline
                key={`p${i}`}
                points={p.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={`rgba(245,245,245,${p.alpha.toFixed(3)})`}
                strokeWidth={p.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {frame.lines.map((l, i) => (
              <line
                key={`l${i}`}
                x1={l.x1.toFixed(1)}
                y1={l.y1.toFixed(1)}
                x2={l.x2.toFixed(1)}
                y2={l.y2.toFixed(1)}
                stroke={`rgba(245,245,245,${l.alpha.toFixed(3)})`}
                strokeWidth={1}
              />
            ))}
            {frame.dots.map((d, i) => (
              <circle
                key={`d${i}`}
                cx={d.x.toFixed(1)}
                cy={d.y.toFixed(1)}
                r={d.r.toFixed(2)}
                fill={`rgba(245,245,245,${d.alpha.toFixed(3)})`}
              />
            ))}
          </svg>
          {frame.glyphs.map((g, i) => (
            <div
              key={`g${i}`}
              style={{
                position: "absolute",
                left: g.x - g.size,
                top: g.y - g.size,
                width: g.size * 2,
                height: g.size * 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: g.size,
                lineHeight: 1,
                color: `rgba(245, 245, 245, ${g.alpha.toFixed(3)})`,
              }}
            >
              {g.char}
            </div>
          ))}
          {/* Play glyph, centred on the panel. */}
          <div
            style={{
              position: "absolute",
              left: PANEL.w / 2 - 30,
              top: PANEL.h / 2 - 40,
              width: 60,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e4e4e7",
              fontSize: 60,
            }}
          >
            {"\u25B6"}
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
