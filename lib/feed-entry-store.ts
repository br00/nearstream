import { R2Client } from "@/lib/r2-client";
import type { FeedEntry, NewFeedEntry } from "@/schemas/feed-entry";

export interface FeedEntryStore {
  list(userId: string): Promise<FeedEntry[]>;
  listBySource(userId: string, sourceId: string): Promise<FeedEntry[]>;
  upsertMany(userId: string, entries: NewFeedEntry[]): Promise<number>;
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
    let added = 0;
    for (const input of entries) {
      const id = await makeEntryId(input.sourceId, input.guid);
      if (b.has(id)) continue;
      b.set(id, { ...input, id, fetchedAt: new Date().toISOString() });
      added++;
    }
    return added;
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
    let added = 0;
    for (const input of entries) {
      const id = await makeEntryId(input.sourceId, input.guid);
      const objKey = this.key(userId, input.sourceId, id);
      try {
        const head = await this.client.fetch(`${this.base}/${objKey}`, {
          method: "HEAD",
        });
        if (head.ok) continue;
      } catch {
        // network/signing hiccup on HEAD — fall through to PUT
      }
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
      added++;
    }
    return added;
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
