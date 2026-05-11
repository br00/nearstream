export const DISCIPLINE_TAGS = ["Code", "Photo", "Music", "Writing"] as const;

export type DisciplineTag = (typeof DISCIPLINE_TAGS)[number];

export type StreamEntry = {
  id: string;
  text: string;
  tag: DisciplineTag;
  publishedAt: string;
};

export type NewStreamEntry = Pick<StreamEntry, "text" | "tag">;

export function isDisciplineTag(value: unknown): value is DisciplineTag {
  return (
    typeof value === "string" &&
    (DISCIPLINE_TAGS as readonly string[]).includes(value)
  );
}
