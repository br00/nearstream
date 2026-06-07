// A reader Source — a friend's site you've added to your local feed list.
// "Friend graph is local, like a phone book" (NEARSTREAM.md §05). Each Source
// is a row in *your* reader's contacts; there is no shared graph and no
// platform-mediated discovery. The `feedUrl` is the load-bearing field — the
// "phone number." `name` is your local label; another reader might call the
// same friend something different.
//
// Fetch-state fields (lastFetchedAt, etag, lastModified, lastError) are added
// once a refresh has happened — slice 16 wires the fetcher. They stay optional
// so a freshly added Source is valid before any refresh.

export type Source = {
  id: string;
  /** Local nickname. Free-form; can differ across readers for the same friend. */
  name: string;
  /** RSS / Atom URL — the load-bearing identifier. */
  feedUrl: string;
  /** Optional homepage. Used to "visit their site" from the reader. */
  siteUrl?: string;
  /** ISO timestamp when this Source was added to your local list. */
  addedAt: string;

  /** ISO timestamp of the last successful fetch. Unset until first refresh. */
  lastFetchedAt?: string;
  /** ETag from the last 200 — sent as If-None-Match on next refresh. */
  etag?: string;
  /** Last-Modified from the last 200 — sent as If-Modified-Since on next refresh. */
  lastModified?: string;
  /** Last error message if the most recent refresh failed. Cleared on next success. */
  lastError?: string;
};

export type NewSource = Pick<Source, "name" | "feedUrl" | "siteUrl">;

/** True if `url` parses as http(s) — minimal sanity check, not a full feed probe. */
export function isValidFeedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
