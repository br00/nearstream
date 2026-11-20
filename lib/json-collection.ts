// A folder of JSON records — the smallest store shape, shared by the
// protocol stores (`lib/share-store.ts`). Every other store in lib/ grew
// its own InMemory + R2 pair; this one is generic because the protocol
// records are plain rows with no per-type queries beyond "list a folder".
//
// Paths are R2 keys without the `.json` suffix, e.g.
// `users/{userId}/keys/{token}`. Callers own the layout.

import { R2Client } from "@/lib/r2-client";

export interface JsonCollection<T> {
  get(path: string): Promise<T | null>;
  put(path: string, value: T): Promise<void>;
  delete(path: string): Promise<boolean>;
  /** Every record directly under `folder` (which must end in `/`). */
  list(folder: string): Promise<T[]>;
}

class InMemoryJsonCollection<T> implements JsonCollection<T> {
  private rows = new Map<string, T>();

  async get(path: string) {
    return this.rows.get(path) ?? null;
  }
  async put(path: string, value: T) {
    this.rows.set(path, value);
  }
  async delete(path: string) {
    return this.rows.delete(path);
  }
  async list(folder: string) {
    const out: T[] = [];
    for (const [path, value] of this.rows) {
      if (path.startsWith(folder) && !path.slice(folder.length).includes("/")) {
        out.push(value);
      }
    }
    return out;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2JsonCollection<T> implements JsonCollection<T> {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  async get(path: string): Promise<T | null> {
    const res = await this.client.fetch(`${this.base}/${path}.json`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 GET ${path} failed (${res.status})`);
    return (await res.json()) as T;
  }

  async put(path: string, value: T): Promise<void> {
    const res = await this.client.fetch(`${this.base}/${path}.json`, {
      method: "PUT",
      body: JSON.stringify(value),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) throw new Error(`R2 PUT ${path} failed (${res.status})`);
  }

  async delete(path: string): Promise<boolean> {
    const res = await this.client.fetch(`${this.base}/${path}.json`, {
      method: "DELETE",
    });
    if (res.status === 204) return true;
    if (res.status === 404) return false;
    throw new Error(`R2 DELETE ${path} failed (${res.status})`);
  }

  async list(folder: string): Promise<T[]> {
    const url = `${this.base}/?list-type=2&delimiter=%2F&prefix=${encodeURIComponent(folder)}`;
    const res = await this.client.fetch(url);
    if (!res.ok) throw new Error(`R2 LIST ${folder} failed (${res.status})`);
    const keys = [...(await res.text()).matchAll(/<Key>([^<]+)<\/Key>/g)]
      .map((m) => m[1])
      .filter((k) => k.endsWith(".json"));
    return Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) throw new Error(`R2 GET ${key} failed (${r.status})`);
        return (await r.json()) as T;
      }),
    );
  }
}

/** One collection per name, kept on globalThis in dev so hot reloads don't
 *  wipe in-memory data (same pattern as every other store). */
export function jsonCollection<T>(name: string): JsonCollection<T> {
  const g = globalThis as unknown as {
    __nearstreamCollections?: Map<string, JsonCollection<unknown>>;
  };
  g.__nearstreamCollections ??= new Map();
  const existing = g.__nearstreamCollections.get(name);
  if (existing) return existing as JsonCollection<T>;

  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;
  const collection: JsonCollection<T> =
    accountId && accessKeyId && secretAccessKey && bucket
      ? new R2JsonCollection<T>({ accountId, accessKeyId, secretAccessKey, bucket })
      : new InMemoryJsonCollection<T>();
  console.log(
    `[nearstream] ${name}: ${collection instanceof R2JsonCollection ? "R2" : "in-memory"}`,
  );
  g.__nearstreamCollections.set(name, collection as JsonCollection<unknown>);
  return collection;
}
