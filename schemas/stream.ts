import type { Visibility } from "@/schemas/visibility";

export const DISCIPLINE_TAGS = ["Code", "Photo", "Music", "Writing"] as const;

export type DisciplineTag = (typeof DISCIPLINE_TAGS)[number];

export const LIBRARY_LINK_TYPES = ["essay", "inventory"] as const;
export type LibraryLinkType = (typeof LIBRARY_LINK_TYPES)[number];

export type LibraryLink = {
  type: LibraryLinkType;
  slug: string;
};

export type StreamEntry = {
  id: string;
  text: string;
  tag: DisciplineTag;
  publishedAt: string;
  link?: LibraryLink;
  visibility?: Visibility;
};

export type NewStreamEntry = Pick<
  StreamEntry,
  "text" | "tag" | "link" | "visibility"
>;

export function isDisciplineTag(value: unknown): value is DisciplineTag {
  return (
    typeof value === "string" &&
    (DISCIPLINE_TAGS as readonly string[]).includes(value)
  );
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
