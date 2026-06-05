// User-territory route — NOT a Nearstream platform feature.
//
// This is Alessandro's personal art piece (a port of his "Human circle"
// Processing sketch). It lives in this codebase for now because there's
// only one user; when multi-tenancy lands in Phase 3 it would move into
// a per-user template directory. Anyone forking Nearstream to run their
// own instance should feel free to delete this route — nothing else in
// the platform depends on it.

import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

export const dynamic = "force-dynamic";

const DEFAULT_W = 1200;
const DEFAULT_H = 825;
const MAX_DIM = 6000;

// Algorithm tunables — mirror Alessandro's Processing sketch.
const N_MAX = 0.45;
const ANGLE_STEP = 0.012; // brush marks per circle
const BRUSH_ANGLE_STEP = 0.1;
const BRUSH_NOISE_RANGE = 15;
const BASE_RADIUS_FRAC = 0.30;
const RADIUS_RANGE_FRAC = 0.10;
// How much the noise z-axis drifts per day. Higher = consecutive days look
// more different. 0.3 gives clearly distinct days while preserving a sense
// of slow continuous evolution if you flip through them.
const Z_PER_DAY = 0.3;

type Theme = "light" | "dark";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = parseDate(url.searchParams.get("date"));
  const theme: Theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
  const w = clampInt(url.searchParams.get("w"), DEFAULT_W, 100, MAX_DIM);
  const h = clampInt(url.searchParams.get("h"), DEFAULT_H, 100, MAX_DIM);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const dayIndex = Math.floor(date.getTime() / 86400000);
  const z = dayIndex * Z_PER_DAY;

  drawHumanCircle(ctx, w, h, z, theme);

  const png = await canvas.encode("png");

  const isToday = sameUtcDay(date, new Date());
  const headers = new Headers({
    "Content-Type": "image/png",
    "Content-Disposition": `inline; filename="human-circle-${isoDate(date)}.png"`,
    "X-Circle-Date": isoDate(date),
    "X-Circle-DayIndex": String(dayIndex),
  });
  if (isToday) {
    // Today's image: cache at CDN for 24h, browser 5 min, can serve stale while revalidating.
    headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400",
    );
  } else {
    // Historical/future preview: deterministic, immutable.
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  // `Buffer` isn't directly assignable to `BodyInit` in the lib.dom types we
  // use; wrap in a `Uint8Array` view over the same memory (zero copy).
  return new Response(new Uint8Array(png), { headers });
}

function parseDate(value: string | null): Date {
  if (!value) return new Date();
  // Accept YYYY-MM-DD. Interpret as UTC midnight to avoid timezone drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return new Date();
  const d = new Date(
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)),
  );
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function clampInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sameUtcDay(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b);
}

// ---------------------------------------------------------------------------
// Human Circle algorithm — port of Alessandro's Processing sketch.
// Self-contained: inline Perlin 3D noise + the brush algorithm. No deps
// beyond `@napi-rs/canvas` (which provides the 2D context).
// ---------------------------------------------------------------------------

const PERM = (() => {
  const p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];
  const arr = new Uint8Array(512);
  for (let i = 0; i < 256; i++) arr[i] = arr[i + 256] = p[i];
  return arr;
})();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}
function grad3(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function perlin3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;
  return lerp(
    lerp(
      lerp(grad3(PERM[AA], x, y, z), grad3(PERM[BA], x - 1, y, z), u),
      lerp(grad3(PERM[AB], x, y - 1, z), grad3(PERM[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(
        grad3(PERM[AA + 1], x, y, z - 1),
        grad3(PERM[BA + 1], x - 1, y, z - 1),
        u,
      ),
      lerp(
        grad3(PERM[AB + 1], x, y - 1, z - 1),
        grad3(PERM[BB + 1], x - 1, y - 1, z - 1),
        u,
      ),
      v,
    ),
    w,
  );
}
function noise01(x: number, y: number, z: number): number {
  return (perlin3(x, y, z) + 1) * 0.5;
}
function mapTo(v: number, a: number, b: number, c: number, d: number): number {
  return c + ((v - a) * (d - c)) / (b - a);
}

type ThemeColors = {
  background: string;
  brushColor: (alpha: number) => string;
};

const THEMES: Record<Theme, ThemeColors> = {
  // Inverted for e-ink / print: dark marks on near-white paper. Matches the
  // commented-out `background(245)` line in Alessandro's original sketch.
  light: {
    background: "#f5f5f5",
    brushColor: (a) => `rgba(20, 20, 20, ${a})`,
  },
  // Matches the on-screen v1 (the canvas in the home page hero): light marks
  // on near-black.
  dark: {
    background: "#000000",
    brushColor: (a) => `rgba(245, 245, 245, ${a})`,
  },
};

function drawHumanCircle(
  ctx: SKRSContext2D,
  w: number,
  h: number,
  z: number,
  theme: Theme,
) {
  const colors = THEMES[theme];

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const half = Math.min(cx, cy);
  const radiusBase = half * BASE_RADIUS_FRAC;
  const radiusRange = half * RADIUS_RANGE_FRAC;
  const brushScale = half / 220;

  for (let a = 0; a < Math.PI * 2; a += ANGLE_STEP) {
    const xoff = mapTo(Math.cos(a), -1, 1, 0, N_MAX);
    const yoff = mapTo(Math.sin(a), -1, 1, 0, N_MAX);
    const n = noise01(xoff, yoff, z);
    const r = mapTo(n, 0, 1, radiusBase, radiusBase + radiusRange * 2);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pencilBrush(ctx, x, y, Math.cos(a), brushScale, colors);
  }
}

function pencilBrush(
  ctx: SKRSContext2D,
  x1: number,
  y1: number,
  inc: number,
  brushScale: number,
  colors: ThemeColors,
) {
  // Alpha modulated by position on the circle — one side brighter than the
  // other. Range matches Processing's `map(inc, -1, 1, 100, 160)`.
  const alpha = mapTo(inc, -1, 1, 100, 160) / 255;
  ctx.fillStyle = colors.brushColor(alpha);

  ctx.beginPath();
  let first = true;
  for (let a = 0; a < Math.PI * 2; a += BRUSH_ANGLE_STEP) {
    const xoff = mapTo(Math.cos(a), -1, 1, 0, BRUSH_NOISE_RANGE);
    const yoff = mapTo(Math.sin(a), -1, 1, 0, BRUSH_NOISE_RANGE);
    const r = mapTo(noise01(xoff, yoff, 100), 0, 1, 1, 3) * brushScale;
    const bx = r * Math.cos(a);
    const by = r * Math.sin(a);
    if (first) {
      ctx.moveTo(x1 - bx, y1 - by);
      first = false;
    } else {
      ctx.lineTo(x1 - bx, y1 - by);
    }
  }
  ctx.closePath();
  ctx.fill();
}
