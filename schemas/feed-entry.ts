// A normalized entry pulled from a friend's feed. Each Source has many
// FeedEntries; we own the storage (R2) so the reader is read offline and
// without re-hitting friends' sites on every page load.
//
// `id` is derived from `(sourceId, guid)` so the same entry stays stable
// across refetches. `guid` is the RSS `<guid>` or Atom `<id>`; if neither
// exists we fall back to the entry's URL.
//
// `type` is set in slice 17 (note / essay / picture detection). Slice 16
// always writes "unknown" — slice 17 fills it in.

export type FeedEntryType = "note" | "essay" | "picture" | "voice" | "unknown";

/** Voice-note payload parsed from a friend's feed. Populated by
 *  `pickFeedAudio()` in lib/feed-parser.ts from either the Nearstream
 *  `<nearstream:audio>` extension or a fallback audio `<enclosure>`. */
export type FeedEntryAudio = {
  url: string;
  mime: string;
  /** ms. Missing on non-Nearstream feeds (arbitrary podcasts advertise
   *  duration in HH:MM:SS via iTunes namespace we don't yet parse); the
   *  player falls back to the audio element's own metadata in that case. */
  durationMs?: number;
  /**
   * The author's chosen visualizer, carried on the feed so their voice
   * looks the same in someone else's reader as on their own page. A
   * `VoiceVizKey`, but deliberately typed as a plain string here: this
   * comes off the wire from an instance that may ship variants we don't
   * have. `normalizeVoiceViz` maps anything unrecognised to the default.
   * Absent for non-Nearstream feeds and for older Nearstream feeds.
   */
  viz?: string;
};

export type FeedEntryImage = {
  /** Full-resolution permalink. Fallback when no thumb is available. */
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
  /** Reader-sized variant. Nearstream feeds emit a 600px-cap JPEG via the
   *  `<nearstream:thumbnail>` extension. Arbitrary RSS feeds rarely do, so
   *  this stays optional — `url` is the load-bearing field. */
  thumbUrl?: string;
  thumbWidth?: number;
  thumbHeight?: number;
};

export type FeedEntry = {
  /** Stable across refetches: `sha256(sourceId + guid)` truncated. */
  id: string;
  sourceId: string;
  /** RSS `<guid>` or Atom `<id>`; falls back to the entry URL. */
  guid: string;
  /** Permalink. Required — if a feed item has no link we skip it. */
  url: string;
  /** ISO publication timestamp. */
  publishedAt: string;
  /** Optional — RSS may have empty title; notes have none. */
  title?: string;
  /** From the feed's author field, or null to display the Source name. */
  authorName?: string;
  /** Rendered HTML content (from `<description>` / `<content:encoded>` / Atom `<content>`). */
  body?: string;
  /** Plain-text excerpt for cards / list views. */
  excerpt?: string;
  /** Set in slice 17. Slice 16 writes "unknown". */
  type: FeedEntryType;
  /** Legacy single-image field. Items mirrored from `images[0]` for one
   *  release so older read paths don't break. Use `imagesOf()` from
   *  schemas/feed-entry.ts. */
  image?: FeedEntryImage;
  /** Ordered image list for picture entries with multiple images (slice
   *  34). `images[0]` is the cover. Populated by the parser from
   *  `<nearstream:image>` extension elements or from multiple RSS
   *  `<enclosure>` tags. May be undefined for legacy entries; callers
   *  should use `imagesOf()` which coalesces both shapes. */
  images?: FeedEntryImage[];
  /** Voice-note attachment (slice 39). Present when `type === "voice"`,
   *  populated from `<nearstream:audio>` or a fallback audio `<enclosure>`. */
  audio?: FeedEntryAudio;
  /** When our reader first saw this entry. */
  fetchedAt: string;
};

/** Read-side helper. Returns the canonical image list whether the entry
 *  was parsed before slice 34 (one `image`) or after (an `images` array).
 *  Returns [] for entries with no images at all (notes, essays). */
export function feedImagesOf(entry: Pick<FeedEntry, "image" | "images">): FeedEntryImage[] {
  if (entry.images && entry.images.length > 0) return entry.images;
  if (entry.image) return [entry.image];
  return [];
}

export type NewFeedEntry = Omit<FeedEntry, "id" | "fetchedAt">;
