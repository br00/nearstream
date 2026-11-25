import type { Visibility } from "@/schemas/visibility";

export { slugify, isValidSlug } from "@/lib/slug";

export type Essay = {
  id: string;
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
  visibility?: Visibility;
  /** Media keys of images uploaded for this essay and still used in its
   *  body (`lib/essay-images.ts`). Deleted with the essay. Images merely
   *  referenced — a pasted Picture URL — are not listed here. */
  images?: string[];
};

export type NewEssay = Pick<Essay, "title" | "body" | "visibility" | "images">;
