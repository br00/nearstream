// Music-track share preview card (slice 40).
//
// Two layouts, chosen by whether the track has cover art:
//
//   with a cover — the cover fills the frame, dimmed, with the byline over
//   it. This is the one that matters: a shared track should look like the
//   record it is, and cover art is what makes a link recognisable in a
//   chat window.
//
//   without one — falls back to the voice-note treatment: a frozen frame of
//   the author's visualizer in the left panel, text on the right. Reuses
//   `lib/voice-viz-static.ts` rather than inventing a second still.
//
// Satori can render a remote <img>, but only over plain HTTP(S) with no
// auth — which our own /api/media route satisfies, since media is served
// unauthenticated by key.

import { ImageResponse } from "next/og";
import { userStore } from "@/lib/user-store";
import { musicStore } from "@/lib/music-store";
import { normalizeVoiceViz } from "@/lib/voice-viz-variants";
import { staticVoiceViz } from "@/lib/voice-viz-static";
import { formatTrackDuration } from "@/schemas/music";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = { w: 1200, h: 630 };
const PANEL = { w: CANVAS.w * 0.5, h: CANVAS.h };

const INSTANCE_URL =
  process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";

/** Stable per-track seed so a given track always renders the same still. */
function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000 || 1;
}

/** Fetch a media object and return it as a data URI, or null on any
 *  failure — a missing cover falls back to the visualizer layout. */
async function inlineCover(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${INSTANCE_URL}/api/media/${key}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    // Network error, timeout, or R2's occasional first-request TLS hiccup.
    return null;
  }
}

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

export default async function Image({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  const displayName = user?.displayName || handle;

  const track = user ? await musicStore.getBySlug(user.id, slug) : null;
  const title = track?.title ?? "Track";
  const artist = track?.artist ?? displayName;
  const durationLabel = formatTrackDuration(track?.audio.durationMs);
  // Inline the cover rather than handing Satori a URL to fetch itself.
  // Satori has no error channel for a failed image load — it just omits
  // the element — so a slow or erroring media route would silently produce
  // a black card with text floating on it, which reads as broken. Fetching
  // here means a failure is something we can see and fall back from.
  //
  // The thumbnail is deliberate: it's the 600px-capped JPEG, so this is a
  // ~100KB fetch instead of a multi-megabyte original, and the image is
  // dimmed to 38% behind text where the softness doesn't show.
  const coverDataUri = track?.cover
    ? await inlineCover(track.cover.thumbKey ?? track.cover.key)
    : null;

  const kickerStyle = {
    fontSize: 22,
    color: "#a1a1aa",
    textTransform: "uppercase" as const,
    letterSpacing: "5px",
    fontFamily: "monospace",
    whiteSpace: "nowrap" as const,
  };

  if (coverDataUri) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#000",
          }}
        >
          <img
            src={coverDataUri}
            alt=""
            width={CANVAS.w}
            height={CANVAS.h}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CANVAS.w,
              height: CANVAS.h,
              objectFit: "cover",
            }}
          />
          {/* Scrim. Cover art is arbitrary — it can be white, busy, or
              both — so the text needs its own contrast floor rather than
              trusting the image underneath. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CANVAS.w,
              height: CANVAS.h,
              background: "rgba(0, 0, 0, 0.62)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              width: "100%",
              height: "100%",
              padding: "80px 100px",
              gap: "18px",
            }}
          >
            <div style={kickerStyle}>Nearstream &middot; Track</div>
            <div
              style={{
                fontSize: 76,
                lineHeight: 1.05,
                color: "#fafafa",
                letterSpacing: "-1.5px",
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 30, color: "#d4d4d8" }}>
              {[artist, durationLabel].filter(Boolean).join("  ·  ")}
            </div>
          </div>
        </div>
      ),
      size,
    );
  }

  // No cover: frozen visualizer panel, same shape as the voice-note card.
  const frame = staticVoiceViz(
    normalizeVoiceViz(user?.preferences?.voiceViz),
    PANEL.w,
    PANEL.h,
    seedFrom(track?.id ?? slug),
  );

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
          <svg
            width={PANEL.w}
            height={PANEL.h}
            viewBox={`0 0 ${PANEL.w} ${PANEL.h}`}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {frame.paths.map((p, i) => (
              <polyline
                key={`p${i}`}
                points={p.points
                  .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                  .join(" ")}
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
                color: `rgba(245,245,245,${g.alpha.toFixed(3)})`,
              }}
            >
              {g.char}
            </div>
          ))}
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
            {"▶"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "22px",
            flex: 1,
          }}
        >
          <div style={kickerStyle}>Nearstream &middot; Track</div>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              color: "#e4e4e7",
              letterSpacing: "-1.5px",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa" }}>
            {[artist, durationLabel].filter(Boolean).join("  ·  ")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
