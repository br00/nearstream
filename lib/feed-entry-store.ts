import { R2Client } from "@/lib/r2-client";
import type { FeedEntry, NewFeedEntry } from "@/schemas/feed-entry";

export interface FeedEntryStore {
  list(userId: string): Promise<FeedEntry[]>;
  listBySource(userId: string, sourceId: string): Promise<FeedEntry[]>;
  upsertMany(userId: string, entries: NewFeedEntry[]): Promise<number>;
  /** Replace this source's locally-stored entries with `entries`. Anything we
   *  had cached whose `(sourceId, guid)` isn't in the new list gets deleted —
   *  the source feed is authoritative on each successful refresh. Returns
   *  counts of what was added and what was removed. */
  syncBySource(
    userId: string,
    sourceId: string,
    entries: NewFeedEntry[],
  ): Promise<{ added: number; removed: number }>;
  deleteBySource(userId: string, sourceId: string): Promise<number>;
}

/** Stable across refetches: same (sourceId, guid) → same id. */
async function makeEntryId(sourceId: string, guid: string): Promise<string> {
  const data = new TextEncoder().encode(`${sourceId}::${guid}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 24);
}

class InMemoryFeedEntryStore implements FeedEntryStore {
  private entries = new Map<string, Map<string, FeedEntry>>();
  private bucket(userId: string): Map<string, FeedEntry> {
    let b = this.entries.get(userId);
    if (!b) {
      b = new Map();
      this.entries.set(userId, b);
    }
    return b;
  }

  async list(userId: string): Promise<FeedEntry[]> {
    return [...this.bucket(userId).values()].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async listBySource(userId: string, sourceId: string): Promise<FeedEntry[]> {
    return (await this.list(userId)).filter((e) => e.sourceId === sourceId);
  }

  async upsertMany(userId: string, entries: NewFeedEntry[]): Promise<number> {
    const b = this.bucket(userId);
    let written = 0;
    for (const input of entries) {
      const id = await makeEntryId(input.sourceId, input.guid);
      // Always overwrite. The original "skip if exists" semantic meant
      // schema additions (e.g. slice 30's thumbUrl) never reached existing
      // entries — friends had to delete + repost for the change to take.
      // Overwriting on each refresh keeps the local mirror in sync with
      // the friend's current RSS for the cost of a re-PUT per entry.
      // Return value is now "wrote N" rather than "added N new", but the
      // only consumer is the refresh logger.
      b.set(id, { ...input, id, fetchedAt: new Date().toISOString() });
      written++;
    }
    return written;
  }

  async syncBySource(
    userId: string,
    sourceId: string,
    entries: NewFeedEntry[],
  ): Promise<{ added: number; removed: number }> {
    const b = this.bucket(userId);
    const newIds = new Set<string>();
    for (const e of entries) {
      newIds.add(await makeEntryId(e.sourceId, e.guid));
    }
    let removed = 0;
    for (const [id, e] of b) {
      if (e.sourceId === sourceId && !newIds.has(id)) {
        b.delete(id);
        removed++;
      }
    }
    const added = await this.upsertMany(userId, entries);
    return { added, removed };
  }

  async deleteBySource(userId: string, sourceId: string): Promise<number> {
    const b = this.bucket(userId);
    let n = 0;
    for (const [id, e] of b) {
      if (e.sourceId === sourceId) {
        b.delete(id);
        n++;
      }
    }
    return n;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2FeedEntryStore implements FeedEntryStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  private key(userId: string, sourceId: string, entryId: string) {
    return `users/${userId}/reader/feed/${sourceId}/${entryId}.json`;
  }

  private prefix(userId: string, sourceId?: string) {
    return sourceId
      ? `users/${userId}/reader/feed/${sourceId}/`
      : `users/${userId}/reader/feed/`;
  }

  async list(userId: string): Promise<FeedEntry[]> {
    return this.listByPrefix(this.prefix(userId));
  }

  async listBySource(userId: string, sourceId: string): Promise<FeedEntry[]> {
    return this.listByPrefix(this.prefix(userId, sourceId));
  }

  private async listByPrefix(prefix: string): Promise<FeedEntry[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText}): ${await listRes.text()}`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];

    const entries = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(`R2 GET ${key} failed (${r.status} ${r.statusText})`);
        }
        return (await r.json()) as FeedEntry;
      }),
    );

    return entries.sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async upsertMany(userId: string, entries: NewFeedEntry[]): Promise<number> {
    // Always overwrite. The previous HEAD-then-skip pattern saved a PUT per
    // already-mirrored entry but meant schema additions (e.g. slice 30's
    // thumbUrl) never reached entries we'd already stored. The R2 PUT is
    // a Class A op at ~$4.50/million — negligible for the small-instance
    // scale Nearstream targets — and dropping the HEAD removes a round
    // trip per entry, partially offsetting the new write cost. Return
    // value is now "wrote N" rather than "added N new"; the only consumer
    // is the refresh logger.
    let written = 0;
    for (const input of entries) {
      const id = await makeEntryId(input.sourceId, input.guid);
      const objKey = this.key(userId, input.sourceId, id);
      const entry: FeedEntry = {
        ...input,
        id,
        fetchedAt: new Date().toISOString(),
      };
      const res = await this.client.fetch(`${this.base}/${objKey}`, {
        method: "PUT",
        body: JSON.stringify(entry),
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(
          `R2 PUT ${objKey} failed (${res.status} ${res.statusText}): ${await res.text()}`,
        );
      }
      written++;
    }
    return written;
  }

  async syncBySource(
    userId: string,
    sourceId: string,
    entries: NewFeedEntry[],
  ): Promise<{ added: number; removed: number }> {
    // What does the friend's feed *currently* say? Anything else we have
    // locally is a stale entry the friend deleted on their end.
    const newIds = new Set<string>();
    for (const e of entries) {
      newIds.add(await makeEntryId(e.sourceId, e.guid));
    }

    const prefix = this.prefix(userId, sourceId);
    const listUrl = `${this.base}/?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    const listRes = await this.client.fetch(listUrl);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText})`,
      );
    }
    const keys = parseListKeys(await listRes.text());

    let removed = 0;
    await Promise.all(
      keys.map(async (key) => {
        // Extract the entry id from `users/{u}/reader/feed/{s}/{id}.json`.
        const idPart = key.slice(prefix.length).replace(/\.json$/, "");
        if (newIds.has(idPart)) return;
        const r = await this.client.fetch(`${this.base}/${key}`, {
          method: "DELETE",
        });
        if (r.status !== 204 && r.status !== 404) {
          throw new Error(
            `R2 DELETE ${key} failed (${r.status} ${r.statusText})`,
          );
        }
        removed++;
      }),
    );

    const added = await this.upsertMany(userId, entries);
    return { added, removed };
  }

  async deleteBySource(userId: string, sourceId: string): Promise<number> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(this.prefix(userId, sourceId))}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText})`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return 0;
    await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`, {
          method: "DELETE",
        });
        if (r.status !== 204 && r.status !== 404) {
          throw new Error(`R2 DELETE ${key} failed (${r.status} ${r.statusText})`);
        }
      }),
    );
    return keys.length;
  }
}

function parseListKeys(xml: string): string[] {
  const out: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function pickStore(): FeedEntryStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] feed-entry-store: R2");
    return new R2FeedEntryStore({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
  }
  console.log(
    "[nearstream] feed-entry-store: in-memory (set R2_* env vars for R2)",
  );
  return new InMemoryFeedEntryStore();
}

const globalForFeedEntryStore = globalThis as unknown as {
  __nearstreamFeedEntryStore?: FeedEntryStore;
};

export const feedEntryStore: FeedEntryStore =
  globalForFeedEntryStore.__nearstreamFeedEntryStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForFeedEntryStore.__nearstreamFeedEntryStore = feedEntryStore;
}
