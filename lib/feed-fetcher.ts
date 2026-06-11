// One-shot polite fetch of a single Source's feed.
//
// "Polite" = sends `If-None-Match` (ETag) and `If-Modified-Since` if we have
// them, so the friend's server can return 304 without rebuilding the feed body.
// On 200 we parse, write new entries, and persist the new ETag / Last-Modified
// back onto the Source row.
//
// All persistence side-effects (entry upsert, Source mutation) happen here so
// the caller (a route handler or future cron) just calls
// `refreshSource(userId, sourceId)`.

import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { parseFeed } from "@/lib/feed-parser";

const USER_AGENT = "Nearstream/0.1 (+https://nearstream.app)";

export type RefreshResult =
  | { status: "ok"; sourceId: string; added: number; notModified: false }
  | { status: "not-modified"; sourceId: string; notModified: true; added: 0 }
  | { status: "error"; sourceId: string; error: string };

export async function refreshSource(
  userId: string,
  id: string,
): Promise<RefreshResult> {
  const source = await sourceStore.get(userId, id);
  if (!source) {
    return { status: "error", sourceId: id, error: "source not found" };
  }

  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
  };
  if (source.etag) headers["if-none-match"] = source.etag;
  if (source.lastModified) headers["if-modified-since"] = source.lastModified;

  let res: Response;
  try {
    res = await fetch(source.feedUrl, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sourceStore.update(userId, id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: `fetch failed: ${message}`,
    });
    return { status: "error", sourceId: id, error: `fetch failed: ${message}` };
  }

  if (res.status === 304) {
    await sourceStore.update(userId, id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: undefined,
    });
    return { status: "not-modified", sourceId: id, added: 0, notModified: true };
  }

  if (!res.ok) {
    const message = `HTTP ${res.status} ${res.statusText}`;
    await sourceStore.update(userId, id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: message,
    });
    return { status: "error", sourceId: id, error: message };
  }

  const xml = await res.text();
  let parsed;
  try {
    parsed = parseFeed(xml, source.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sourceStore.update(userId, id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: `parse failed: ${message}`,
    });
    return { status: "error", sourceId: id, error: `parse failed: ${message}` };
  }

  let added: number;
  try {
    // Sync, not upsert: anything we have locally for this source whose
    // (sourceId, guid) is not in the current feed gets dropped. The feed is
    // authoritative each refresh — if the friend deleted a post on their
    // end, it disappears from our reader on the next refresh too.
    const result = await feedEntryStore.syncBySource(userId, id, parsed.entries);
    added = result.added;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sourceStore.update(userId, id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: `store failed: ${message}`,
    });
    return { status: "error", sourceId: id, error: `store failed: ${message}` };
  }

  await sourceStore.update(userId, id, {
    lastFetchedAt: new Date().toISOString(),
    etag: res.headers.get("etag") ?? undefined,
    lastModified: res.headers.get("last-modified") ?? undefined,
    lastError: undefined,
  });

  return { status: "ok", sourceId: id, added, notModified: false };
}

export async function refreshAllSources(userId: string): Promise<RefreshResult[]> {
  const sources = await sourceStore.list(userId);
  // Sequential rather than parallel: friend feeds are unlikely to live behind
  // CDNs sized for our burst, and 5 simultaneous TLS handshakes on a cold
  // function eats wall time without buying much.
  const results: RefreshResult[] = [];
  for (const s of sources) {
    try {
      results.push(await refreshSource(userId, s.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[refreshAllSources] ${s.id} threw`, err);
      results.push({ status: "error", sourceId: s.id, error: message });
    }
  }
  return results;
}
