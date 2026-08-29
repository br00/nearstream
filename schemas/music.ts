import type { Visibility } from "@/schemas/visibility";

export { slugify, isValidSlug } from "@/lib/slug";

/**
 * A music track — the second Library primitive built on the slice-39 audio
 * layer, and the counterpart to a voice note rather than a variant of it.
 *
 * The split is about where a thing belongs, not what format it is. A voice
 * note is a Stream entry: short, phone-recorded, caption-optional, read in
 * passing. A track is a Library entry: uploaded deliberately, has a title
 * and an artist and a cover, and earns its own URL that stays put.
 *
 * `audio` holds whatever the user uploaded. There's no server-side
 * transcode — the browser that plays it is the browser it was chosen on, so
 * format support is the browser's problem and the file is stored untouched.
 */
export type MusicAudio = {
  key: string;
  /** Stored content-type, e.g. `audio/mpeg`. Drives the `<audio type>` hint. */
  mime: string;
  sizeBytes: number;
  /**
   * Length in ms, read from the decoded `<audio>` element in the browser
   * before upload. Optional because a malformed or streaming-only file can
   * leave `duration` as `Infinity` or `NaN`; the player falls back to the
   * element's own metadata when it's missing.
   */
  durationMs?: number;
};

/** Cover art. Same shape as an inventory image minus the gallery extras. */
export type MusicCover = {
  key: string;
  contentType: string;
  sizeBytes: number;
  thumbKey?: string;
  width?: number;
  height?: number;
};

export type MusicTrack = {
  id: string;
  slug: string;
  title: string;
  /** Free-form. Absent means "the tenant is the artist", which is the common case. */
  artist?: string;
  audio: MusicAudio;
  cover?: MusicCover;
  description?: string;
  publishedAt: string;
  visibility?: Visibility;
};

export type NewMusicTrack = Omit<MusicTrack, "id" | "slug" | "publishedAt">;

/**
 * Edit-time patch. `audio` and `cover` are set at upload time and `slug` is
 * frozen at publish time so the URL stays stable — same rule as inventory.
 */
export type MusicPatch = Omit<NewMusicTrack, "audio" | "cover">;

/** 20MB. A lossless upload blows past this; the form says so up front. */
export const MUSIC_MAX_BYTES = 20 * 1024 * 1024;

/** Display helper shared by the detail page, cards and OG image. */
export function formatTrackDuration(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "Artist — Title", or just the title when the tenant is the artist. */
export function trackByline(track: {
  title: string;
  artist?: string;
}): string {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}
