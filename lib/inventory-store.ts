import { R2Client } from "@/lib/r2-client";
import type { InventoryItem, NewInventoryItem } from "@/schemas/inventory";
import { slugify } from "@/schemas/inventory";
import { mediaStore } from "@/lib/media-store";

export interface InventoryStore {
  list(userId: string): Promise<InventoryItem[]>;
  add(userId: string, input: NewInventoryItem): Promise<InventoryItem>;
  getBySlug(userId: string, slug: string): Promise<InventoryItem | null>;
  deleteBySlug(userId: string, slug: string): Promise<boolean>;
}

class InMemoryInventoryStore implements InventoryStore {
  private items = new Map<string, InventoryItem[]>();
  private bucket(userId: string): InventoryItem[] {
    let b = this.items.get(userId);
    if (!b) {
      b = [];
      this.items.set(userId, b);
    }
    return b;
  }

  async list(userId: string): Promise<InventoryItem[]> {
    return [...this.bucket(userId)].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async add(userId: string, input: NewInventoryItem): Promise<InventoryItem> {
    const item: InventoryItem = {
      ...input,
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      publishedAt: new Date().toISOString(),
    };
    this.bucket(userId).push(item);
    return item;
  }

  async getBySlug(userId: string, slug: string): Promise<InventoryItem | null> {
    return this.bucket(userId).find((i) => i.slug === slug) ?? null;
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const b = this.bucket(userId);
    const i = b.findIndex((it) => it.slug === slug);
    if (i === -1) return false;
    b.splice(i, 1);
    return true;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2InventoryStore implements InventoryStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  private prefix(userId: string) {
    return `users/${userId}/library/inventory/`;
  }

  private key(userId: string, id: string) {
    return `${this.prefix(userId)}${id}.json`;
  }

  async add(userId: string, input: NewInventoryItem): Promise<InventoryItem> {
    const item: InventoryItem = {
      ...input,
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      publishedAt: new Date().toISOString(),
    };
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, item.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(item),
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return item;
  }

  async list(userId: string): Promise<InventoryItem[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(this.prefix(userId))}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText}): ${await listRes.text()}`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];

    const items = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(`R2 GET ${key} failed (${r.status} ${r.statusText})`);
        }
        return (await r.json()) as InventoryItem;
      }),
    );

    return items.sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async getBySlug(userId: string, slug: string): Promise<InventoryItem | null> {
    const all = await this.list(userId);
    return all.find((i) => i.slug === slug) ?? null;
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const target = await this.getBySlug(userId, slug);
    if (!target) return false;

    if (mediaStore) {
      try {
        await mediaStore.deleteImage(target.image.key);
        if (target.image.thumbKey) {
          await mediaStore.deleteImage(target.image.thumbKey);
        }
      } catch (err) {
        console.warn(
          "[nearstream] inventory cascade delete: media delete failed (continuing):",
          err instanceof Error ? err.message : err,
        );
      }
    }

    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, target.id)}`,
      { method: "DELETE" },
    );
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

function pickStore(): InventoryStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] inventory-store: R2");
    return new R2InventoryStore({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
  }
  console.log(
    "[nearstream] inventory-store: in-memory (set R2_* env vars for R2)",
  );
  return new InMemoryInventoryStore();
}

const globalForInventoryStore = globalThis as unknown as {
  __nearstreamInventoryStore?: InventoryStore;
};

export const inventoryStore: InventoryStore =
  globalForInventoryStore.__nearstreamInventoryStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForInventoryStore.__nearstreamInventoryStore = inventoryStore;
}
