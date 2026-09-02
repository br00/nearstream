// The tenant home page as one dated document rather than four sections.
//
// Slice 41. The old home filed everything by category — Stream, Pictures,
// Essays — with 4.5rem of nothing between each. With a real amount of
// content that reads as four filing cabinets; with a small amount it reads
// as empty. This merges everything into a single reverse-chronological
// timeline and lets each kind carry its own form on the page.
//
// Two behaviours live here rather than in the component, because both are
// derived from `publishedAt` and should be computed once, server-side:
//
//   AGE     Older entries lose contrast and gain a hair of blur. Nothing is
//           hidden and nothing is paginated away — the past is simply
//           quieter, and hovering or focusing an entry restores it fully.
//           Recency emerges from optics instead of from an algorithm.
//
//   WET INK An entry written in the last few hours arrives faint and darkens
//           as it sets. You can't see your OWN new post at full strength
//           immediately, which is the opposite of the instant-feedback loop
//           every other posting surface is built around.
//
//           Owner-only, and that's the whole point of it. The argument is
//           about denying the author an instant reward for posting; a
//           visitor arriving at a friend's page is in no such loop, and a
//           dimmed photograph just reads as broken or half-loaded. Applying
//           it to everyone made a friend's fresh photo look like a failed
//           image request.

import type { StreamEntry } from "@/schemas/stream";
import type { Essay } from "@/schemas/essay";
import type { InventoryItem } from "@/schemas/inventory";
import type { MusicTrack } from "@/schemas/music";
import { imagesOf } from "@/schemas/inventory";
import { visibilityOf } from "@/schemas/visibility";
import { formatTrackDuration } from "@/schemas/music";

export type HomeEntryKind =
  | "line"
  | "voice"
  | "picture"
  | "track"
  | "essay";

export type HomeEntry = {
  id: string;
  kind: HomeEntryKind;
  publishedAt: string;
  /** Sequence number, counting down from the newest. Rendered in the margin. */
  number: number;
  /** 0.45–1. Age, or the wet-ink ramp for something written in the last hours. */
  opacity: number;
  /** 0–0.4px. Grows with age; hover clears it. */
  blur: number;
  /** True while the ink is still setting (< WET_HOURS old). */
  wet: boolean;
  /** Owner-only marker: this one isn't public. */
  sealed: boolean;
  href?: string;
  /** Lines and voice captions. */
  text?: string;
  /** A line long enough to be set small rather than large. */
  long?: boolean;
  title?: string;
  excerpt?: string;
  /**
   * Full-resolution key. The home renders pictures at the full column
   * width, so the 600px thumbnail alone is not enough: the column is 544
   * CSS px, which is 1088 device pixels on a retina screen. Both keys are
   * carried so the markup can offer a `srcset` and let the browser choose.
   */
  imageKey?: string;
  imageThumbKey?: string;
  /** Intrinsic dimensions, for srcset widths and to reserve layout space. */
  imageWidth?: number;
  imageHeight?: number;
  imageCount?: number;
  durationLabel?: string;
  audioKey?: string;
  audioMime?: string;
  durationMs?: number;
};

/** Above this many characters a Line is set small and narrow instead of large. */
const LONG_LINE_CHARS = 90;
/**
 * How long ink takes to set, and how faint it starts.
 *
 * Originally 6 hours from 0.35, which was wrong in practice in a way it
 * wasn't in the prototype: a freshly published essay was so faint it read
 * as a rendering fault, and on a hover-capable device it snapped to full
 * strength under the cursor, which made it look like a bug being caught in
 * the act. Publishing something and not being able to see it is a broken
 * flow, not a philosophical position.
 *
 * Softened to a *cue* rather than a veil: legible immediately, visibly
 * newer than everything under it, settled within a few hours.
 */
const WET_HOURS = 3;
const WET_START_OPACITY = 0.82;
/** Age is measured against a year; past that everything is equally distant. */
const AGE_DAYS = 365;
/** Never fade past this — below it the text stops being readable. */
const MIN_OPACITY = 0.45;
const MAX_BLUR = 0.4;

type Sources = {
  entries: StreamEntry[];
  essays: Essay[];
  inventory: InventoryItem[];
  tracks: MusicTrack[];
  base: string;
  /** Owner sees private items, marked as sealed. */
  isOwner: boolean;
  /** Injected so the calculation is testable and deterministic. */
  now?: number;
};

export function buildHomeTimeline({
  entries,
  essays,
  inventory,
  tracks,
  base,
  isOwner,
  now = Date.now(),
}: Sources): HomeEntry[] {
  type Draft = Omit<HomeEntry, "number" | "opacity" | "blur" | "wet">;
  const drafts: Draft[] = [];

  for (const e of entries) {
    const sealed = visibilityOf(e) === "private";
    if (sealed && !isOwner) continue;
    if (e.audio) {
      drafts.push({
        id: e.id,
        kind: "voice",
        publishedAt: e.publishedAt,
        sealed,
        href: `${base}/voice/${e.id}`,
        text: e.text || undefined,
        audioKey: e.audio.key,
        audioMime: e.audio.mime,
        durationMs: e.audio.durationMs,
        durationLabel: formatTrackDuration(e.audio.durationMs),
      });
      continue;
    }
    const text = (e.text ?? "").trim();
    if (!text) continue;
    drafts.push({
      id: e.id,
      kind: "line",
      publishedAt: e.publishedAt,
      sealed,
      text,
      long: text.length > LONG_LINE_CHARS,
    });
  }

  for (const i of inventory) {
    const sealed = visibilityOf(i) === "private";
    if (sealed && !isOwner) continue;
    const images = imagesOf(i);
    const cover = images[0];
    if (!cover) continue;
    drafts.push({
      id: i.id,
      kind: "picture",
      publishedAt: i.publishedAt,
      sealed,
      href: `${base}/library/inventory/${i.slug}`,
      title: i.title,
      imageKey: cover.key,
      imageThumbKey: cover.thumbKey,
      imageWidth: cover.width,
      imageHeight: cover.height,
      imageCount: images.length,
    });
  }

  for (const t of tracks) {
    const sealed = visibilityOf(t) === "private";
    if (sealed && !isOwner) continue;
    drafts.push({
      id: t.id,
      kind: "track",
      publishedAt: t.publishedAt,
      sealed,
      href: `${base}/library/music/${t.slug}`,
      title: t.title,
      text: t.artist,
      durationLabel: formatTrackDuration(t.audio.durationMs),
      imageKey: t.cover?.key,
      imageThumbKey: t.cover?.thumbKey,
      imageWidth: t.cover?.width,
      imageHeight: t.cover?.height,
    });
  }

  for (const e of essays) {
    const sealed = visibilityOf(e) === "private";
    if (sealed && !isOwner) continue;
    drafts.push({
      id: e.id,
      kind: "essay",
      publishedAt: e.publishedAt,
      sealed,
      href: `${base}/library/${e.slug}`,
      title: e.title,
      excerpt: firstLine(e.body),
    });
  }

  drafts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const total = drafts.length;
  return drafts.map((d, i) => {
    const { opacity, blur, wet } = weather(d.publishedAt, now, isOwner);
    return { ...d, number: total - i, opacity, blur, wet };
  });
}

/**
 * How an entry has weathered. Fresh ink is still darkening; after that,
 * time takes contrast away and adds a little softness.
 */
function weather(
  publishedAt: string,
  now: number,
  isOwner: boolean,
): { opacity: number; blur: number; wet: boolean } {
  const ms = now - Date.parse(publishedAt);
  if (!Number.isFinite(ms)) return { opacity: 1, blur: 0, wet: false };

  const hours = ms / 3_600_000;
  // Only the author waits for their own ink to set. For everyone else a
  // fresh entry is simply the newest thing, at full strength.
  if (isOwner && hours >= 0 && hours < WET_HOURS) {
    return {
      opacity: round(
        WET_START_OPACITY + (1 - WET_START_OPACITY) * (hours / WET_HOURS),
      ),
      blur: 0,
      wet: true,
    };
  }

  const t = Math.min(1, Math.max(0, ms / (AGE_DAYS * 86_400_000)));
  return {
    opacity: round(1 - (1 - MIN_OPACITY) * t),
    blur: round(MAX_BLUR * t),
    wet: false,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function firstLine(body: string): string | undefined {
  const stripped = body
    .replace(/^#.*$/gm, "")
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return undefined;
  return stripped.length > 150 ? stripped.slice(0, 149).trimEnd() + "…" : stripped;
}

/**
 * The strip at the foot: one mark per entry, tallest for the things that
 * took the most out of you. It shows the rhythm of a year — the busy weeks
 * and the quiet months — which a grid of thumbnails can't.
 */
export function yearMarks(
  timeline: HomeEntry[],
  limit = 80,
): { height: number; opacity: number }[] {
  const heights: Record<HomeEntryKind, number> = {
    essay: 100,
    voice: 72,
    track: 66,
    picture: 58,
    line: 38,
  };
  return timeline.slice(0, limit).map((e, i) => ({
    height: e.long && e.kind === "line" ? 56 : heights[e.kind],
    opacity: round(1 - (i / limit) * 0.5),
  }));
}
