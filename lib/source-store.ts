import { R2Client } from "@/lib/r2-client";
import type { Source, NewSource } from "@/schemas/source";

export interface SourceStore {
  list(): Promise<Source[]>;
  add(input: NewSource): Promise<Source>;
  get(id: string): Promise<Source | null>;
  update(id: string, patch: Partial<Source>): Promise<Source | null>;
  delete(id: string): Promise<boolean>;
}

class InMemorySourceStore implements SourceStore {
  private sources: Source[] = [];

  async list(): Promise<Source[]> {
    return [...this.sources].sort((a, b) => a.name.localeCompare(b.name));
  }

  async add(input: NewSource): Promise<Source> {
    const source: Source = {
      id: crypto.randomUUID(),
      name: input.name,
      feedUrl: input.feedUrl,
      siteUrl: input.siteUrl,
      addedAt: new Date().toISOString(),
    };
    this.sources.push(source);
    return source;
  }

  async get(id: string): Promise<Source | null> {
    return this.sources.find((s) => s.id === id) ?? null;
  }

  async update(id: string, patch: Partial<Source>): Promise<Source | null> {
    const i = this.sources.findIndex((s) => s.id === id);
    if (i === -1) return null;
    this.sources[i] = { ...this.sources[i], ...patch, id: this.sources[i].id };
    return this.sources[i];
  }

  async delete(id: string): Promise<boolean> {
    const i = this.sources.findIndex((s) => s.id === id);
    if (i === -1) return false;
    this.sources.splice(i, 1);
    return true;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2SourceStore implements SourceStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  private key(id: string) {
    return `reader/sources/${id}.json`;
  }

  async add(input: NewSource): Promise<Source> {
    const source: Source = {
      id: crypto.randomUUID(),
      name: input.name,
      feedUrl: input.feedUrl,
      siteUrl: input.siteUrl,
      addedAt: new Date().toISOString(),
    };
    const res = await this.client.fetch(`${this.base}/${this.key(source.id)}`, {
      method: "PUT",
      body: JSON.stringify(source),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return source;
  }

  async list(): Promise<Source[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent("reader/sources/")}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText}): ${await listRes.text()}`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];

    const sources = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(
            `R2 GET ${key} failed (${r.status} ${r.statusText})`,
          );
        }
        return (await r.json()) as Source;
      }),
    );

    return sources.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<Source | null> {
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `R2 GET failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return (await res.json()) as Source;
  }

  async update(id: string, patch: Partial<Source>): Promise<Source | null> {
    const current = await this.get(id);
    if (!current) return null;
    const merged: Source = { ...current, ...patch, id: current.id };
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`, {
      method: "PUT",
      body: JSON.stringify(merged),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return merged;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`, {
      method: "DELETE",
    });
    if (res.status === 204) return true;
    if (res.status === 404) return false;
    throw new Error(
      `R2 DELETE failed (${res.status} ${res.statusText}): ${await res.text()}`,
    );
  }
}

function parseListKeys(xml: string): string[] {
  const out: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function pickStore(): SourceStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] source-store: R2");
    return new R2SourceStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log("[nearstream] source-store: in-memory (set R2_* env vars for R2)");
  return new InMemorySourceStore();
}

const globalForSourceStore = globalThis as unknown as {
  __nearstreamSourceStore?: SourceStore;
};

export const sourceStore: SourceStore =
  globalForSourceStore.__nearstreamSourceStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForSourceStore.__nearstreamSourceStore = sourceStore;
}
