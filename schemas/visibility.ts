// Per-post visibility — three levels (PROTOCOL.md §5).
//
//  - public:  anyone. On the tenant site, in the public RSS feed, and in
//             every key feed.
//  - friends: only people you've shared with. Never on the tenant site for
//             non-owners, never in the public feed — only in key feeds
//             (`/{handle}/feed/{token}`).
//  - private: only you.
//
// Rule for every read path: a non-owner sees an entry only when it is
// `public`. Key feeds are the single exception, and they live in
// `lib/feed-xml.ts`. Use `isPublic()` rather than comparing against
// "private" — a `=== "private"` check silently leaks `friends` entries.

export const VISIBILITY_LEVELS = ["public", "friends", "private"] as const;

export type Visibility = (typeof VISIBILITY_LEVELS)[number];

export function isVisibility(value: unknown): value is Visibility {
  return (
    typeof value === "string" &&
    (VISIBILITY_LEVELS as readonly string[]).includes(value)
  );
}

/** Treat a missing visibility field as public — backward compatibility for
 *  entries created before per-post visibility landed. */
export function visibilityOf(entry: {
  visibility?: Visibility;
}): Visibility {
  return entry.visibility ?? "public";
}

/** One-line explanation shown under each choice in every posting form. */
export const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
  public: "Anyone with the URL.",
  friends:
    "Only people you share with. Hidden from your public site and public feed.",
  private: "Only you. Hidden from the public site and from your RSS feed.",
};

/** True when anyone may see the entry. The check every non-owner read path
 *  should use. */
export function isPublic(entry: { visibility?: Visibility }): boolean {
  return visibilityOf(entry) === "public";
}

/** Owner-facing badge text for a non-public entry, or null when public. */
export function restrictionLabel(entry: {
  visibility?: Visibility;
}): "Friends" | "Private" | null {
  switch (visibilityOf(entry)) {
    case "public":
      return null;
    case "friends":
      return "Friends";
    case "private":
      return "Private";
  }
}
