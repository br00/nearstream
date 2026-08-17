// Daily digest — pure logic. The cron entry point in
// app/api/cron/daily-digest/route.ts calls `buildUserDigest` per user
// and passes the result to `sendDigestEmail`. Keeping the shaping
// separate from the delivery makes both trivial to test and lets us
// preview a digest in dev without sending mail.

import type { FeedEntry, FeedEntryImage } from "@/schemas/feed-entry";
import type { Source } from "@/schemas/source";

export type DigestEntryType =
  | "note"
  | "essay"
  | "picture"
  | "voice"
  | "track"
  | "unknown";

export type DigestItem = {
  authorName: string;
  type: DigestEntryType;
  title?: string;
  excerpt?: string;
  url: string;
  publishedAt: string;
  imageThumbUrl?: string;
  /** Audio duration in ms (slice 39). Rendered as `▶ 0:23` in the digest
   *  row when present. Set for voice notes and music tracks. */
  audioDurationMs?: number;
  /** Track artist (slice 40). Shown in the kicker so a digest row reads
   *  "ALESSANDRO · track · Artist · 3:24". Undefined for non-tracks. */
  trackArtist?: string;
};

export type Digest = {
  /** Inclusive lower bound (ISO). Everything with publishedAt > since. */
  since: string;
  /** Inclusive upper bound (ISO). Everything with publishedAt <= until. */
  until: string;
  /** Ordered newest-first. Empty means "quiet day — don't send." */
  items: DigestItem[];
  /** Count of distinct authors. Used in the subject line. */
  authorCount: number;
};

/**
 * Build the digest for one user. `entries` should be the user's
 * feedEntryStore.list() — everything cached from friends' feeds so far.
 * `sources` provides author names when the entry didn't carry one.
 * Returns null if there was no activity in the window (skip sending).
 *
 * `since` is the previous digest's timestamp (or "24h before `until`"
 * on first send). `until` is normally "now."
 */
export function buildUserDigest(
  entries: FeedEntry[],
  sources: Source[],
  since: string,
  until: string,
): Digest | null {
  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) return null;

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const items: DigestItem[] = [];
  const authors = new Set<string>();
  for (const e of entries) {
    const publishedMs = Date.parse(e.publishedAt);
    if (!Number.isFinite(publishedMs)) continue;
    if (publishedMs <= sinceMs) continue;
    if (publishedMs > untilMs) continue;

    const source = sourceById.get(e.sourceId);
    const authorName = e.authorName ?? source?.name ?? "unknown";
    authors.add(authorName);

    const image = firstImage(e);
    items.push({
      authorName,
      type: (e.type as DigestEntryType) ?? "unknown",
      title: e.title,
      excerpt: e.excerpt,
      url: e.url,
      publishedAt: e.publishedAt,
      // A track's cover comes off the `nearstream:track`/`cover` pair
      // rather than the image list, so fall through to it here.
      imageThumbUrl: image?.thumbUrl ?? image?.url ?? e.track?.coverUrl,
      ...(e.track?.durationMs ?? e.audio?.durationMs
        ? { audioDurationMs: e.track?.durationMs ?? e.audio?.durationMs }
        : {}),
      ...(e.track?.artist ? { trackArtist: e.track.artist } : {}),
    });
  }

  if (items.length === 0) return null;
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    since,
    until,
    items,
    authorCount: authors.size,
  };
}

function firstImage(entry: FeedEntry): FeedEntryImage | undefined {
  if (entry.images && entry.images.length > 0) return entry.images[0];
  return entry.image;
}

// ─────────────────────────────────────────────────────────────────────────
// Subject + text-body formatters. HTML lives in lib/email.ts so it can
// share the shell template with sign-in / welcome mails.
// ─────────────────────────────────────────────────────────────────────────

/** Subject line — kept short so the whole thing shows in mobile clients. */
export function digestSubject(digest: Digest): string {
  const authorLabel =
    digest.authorCount === 1
      ? `${digest.items[0].authorName}`
      : `${digest.authorCount} friends`;
  const postLabel =
    digest.items.length === 1 ? "posted" : `posted ${digest.items.length} times`;
  return `Nearstream · ${authorLabel} ${postLabel}`;
}

/** Plain-text fallback body. Kept scannable. */
export function digestTextBody(digest: Digest, readerUrl: string): string {
  const lines: string[] = ["NEARSTREAM", ""];
  for (const item of digest.items) {
    const label = item.type === "unknown" ? "post" : item.type;
    const kicker = `${item.authorName.toUpperCase()} · ${digestKickerLabel(item, label)}`;
    lines.push(kicker);
    if (item.title) lines.push(item.title);
    if (item.excerpt && item.excerpt !== item.title) {
      lines.push(truncate(item.excerpt, 140));
    }
    lines.push(item.url);
    lines.push("");
  }
  lines.push(`Open reader: ${readerUrl}`);
  lines.push("");
  lines.push(
    "You're getting this because a friend on your Nearstream instance posted today. Turn it off in Settings.",
  );
  return lines.join("\n");
}

/**
 * The "voice note · 0:23" / "track · Artist · 3:24" part of a digest
 * kicker, shared by the text and HTML renderers so the two can't drift.
 */
export function digestKickerLabel(
  item: Pick<DigestItem, "type" | "audioDurationMs" | "trackArtist">,
  fallbackLabel: string,
): string {
  const duration = item.audioDurationMs
    ? formatAudioDuration(item.audioDurationMs)
    : "";
  if (item.type === "voice") {
    return duration ? `voice note · ${duration}` : "voice note";
  }
  if (item.type === "track") {
    return ["track", item.trackArtist, duration].filter(Boolean).join(" · ");
  }
  return fallbackLabel;
}

/** Format ms as "M:SS" for digest rows. */
export function formatAudioDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
