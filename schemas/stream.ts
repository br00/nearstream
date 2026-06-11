import type { Visibility } from "@/schemas/visibility";

// Stream entries are tagged with a **mode** — what *kind* of moment this is —
// not a discipline. Three broad buckets so any friend's stream fits without
// inventing new hashtags. The hint strings are what we show beside each
// option in the picker so people know what each mode is meant to catch.

export const MODE_TAGS = [
  { value: "making", hint: "writing, cooking, sketching, building…" },
  { value: "taking in", hint: "reading, watching, listening…" },
  { value: "being", hint: "feeling, noticing, idling, just life…" },
] as const;

export type ModeTag = (typeof MODE_TAGS)[number]["value"];

/** Default selection in the picker. "Being" catches the most kinds of moments. */
export const DEFAULT_MODE: ModeTag = "being";

export const LIBRARY_LINK_TYPES = ["essay", "inventory"] as const;
export type LibraryLinkType = (typeof LIBRARY_LINK_TYPES)[number];

export type LibraryLink = {
  type: LibraryLinkType;
  slug: string;
};

export type StreamEntry = {
  id: string;
  text: string;
  /** Mode tag — see MODE_TAGS. Legacy entries may carry pre-2026-06-11 strings
   * like "Code" / "Photo" / "Music" / "Writing"; those still render fine, but
   * fail `isModeTag()` so an edit forces re-selection. */
  tag: ModeTag;
  publishedAt: string;
  link?: LibraryLink;
  visibility?: Visibility;
};

export type NewStreamEntry = Pick<
  StreamEntry,
  "text" | "tag" | "link" | "visibility"
>;

export function isModeTag(value: unknown): value is ModeTag {
  if (typeof value !== "string") return false;
  return MODE_TAGS.some((m) => m.value === value);
}

export function isLibraryLinkType(value: unknown): value is LibraryLinkType {
  return (
    typeof value === "string" &&
    (LIBRARY_LINK_TYPES as readonly string[]).includes(value)
  );
}

export function linkHref(link: LibraryLink): string {
  return link.type === "essay"
    ? `/library/${link.slug}`
    : `/library/inventory/${link.slug}`;
}
