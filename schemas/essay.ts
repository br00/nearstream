import type { Visibility } from "@/schemas/visibility";

export { slugify, isValidSlug } from "@/lib/slug";

export type Essay = {
  id: string;
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
  visibility?: Visibility;
};

export type NewEssay = Pick<Essay, "title" | "body" | "visibility">;
