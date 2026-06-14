// Landing share preview card. When `nearstream.app` (or any URL on the
// instance landing) is shared on WhatsApp / iMessage / Slack / LinkedIn, the
// receiving app fetches the URL, reads `<meta property="og:image">`, and
// renders this 1200×630 PNG as the preview.
//
// Tenant-specific preview (chevron + display name) lives at
// `app/[handle]/opengraph-image.tsx`. This one is the instance brand card:
// chevron + Nearstream wordmark + tagline. No per-request data, so it's
// cheap to generate and Next can cache aggressively.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same anchor geometry as `NearstreamMark` and the tenant OG card so the
// brand mark is pixel-consistent across all preview surfaces. Inline because
// `ImageResponse` doesn't render <svg>, so we lay out the dots as
// absolutely-positioned divs.
const MARK_POINTS = [
  { cx: 22, cy: 8, r: 1.8, opacity: 0.3 },
  { cx: 28, cy: 16, r: 2.8, opacity: 0.5 },
  { cx: 38, cy: 22, r: 2.0, opacity: 0.4 },
  { cx: 50, cy: 28, r: 3.5, opacity: 0.9 },
  { cx: 58, cy: 38, r: 2.2, opacity: 0.6 },
  { cx: 62, cy: 48, r: 3.0, opacity: 0.8 },
  { cx: 58, cy: 58, r: 2.5, opacity: 0.7 },
  { cx: 50, cy: 66, r: 3.2, opacity: 1.0 },
  { cx: 42, cy: 74, r: 2.0, opacity: 0.5 },
  { cx: 38, cy: 82, r: 2.8, opacity: 0.6 },
  { cx: 40, cy: 90, r: 1.5, opacity: 0.3 },
] as const;

export default async function Image() {
  const dotScale = 4; // viewbox 0..100 → mark height ~400px on 630px canvas

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
          padding: "80px",
          alignItems: "center",
          gap: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 100 * dotScale,
            height: 100 * dotScale,
            flexShrink: 0,
          }}
        >
          {MARK_POINTS.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.cx * dotScale - p.r * dotScale * 0.5,
                top: p.cy * dotScale - p.r * dotScale * 0.5,
                width: p.r * dotScale,
                height: p.r * dotScale,
                borderRadius: "9999px",
                background: `rgba(245, 245, 245, ${p.opacity})`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "24px",
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
            Nearstream
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 400,
              lineHeight: 1.05,
              color: "#e4e4e7",
              letterSpacing: "-2px",
              whiteSpace: "pre-line",
            }}
          >
            {"A quieter way to share\nwith people you actually know."}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#a1a1aa",
              lineHeight: 1.4,
              maxWidth: 600,
            }}
          >
            No algorithm. No public. Invitation only.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
