// Per-post visibility. Public is the historical default — anyone with the URL
// reads it. Private means only the signed-in author sees the entry on tenant
// pages and in their own /studio; everyone else gets 404 (so the existence of
// the entry isn't even leaked).
//
// A future "friends" level (plan B) needs a friend-graph primitive and an
// instance-authenticated tenant render. Tracked separately — this slice
// commits to just the two ends of the spectrum.

export const VISIBILITY_LEVELS = ["public", "private"] as const;

export type Visibility = (typeof VISIBILITY_LEVELS)[number];

export function isVisibility(value: unknown): value is Visibility {
  return (
    typeof value === "string" &&
    (VISIBILITY_LEVELS as readonly string[]).includes(value)
  );
}

/** Treat a missing visibility field as public — backward compatibility for
 *  entries created before this slice landed. */
export function visibilityOf(entry: {
  visibility?: Visibility;
}): Visibility {
  return entry.visibility ?? "public";
}
