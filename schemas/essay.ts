export type Essay = {
  id: string;
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
};

export type NewEssay = Pick<Essay, "title" | "body">;

const SLUG_MAX = 80;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= SLUG_MAX &&
    /^[a-z0-9-]+$/.test(value)
  );
}
