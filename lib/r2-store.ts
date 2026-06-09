import { R2Client } from "@/lib/r2-client";
import type { NewStreamEntry, StreamEntry } from "@/schemas/stream";
import type { Store } from "@/lib/store";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export class R2Store implements Store {
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
    return `users/${userId}/entries/`;
  }

  private key(userId: string, id: string) {
    return `${this.prefix(userId)}${id}.json`;
  }

  async add(userId: string, input: NewStreamEntry): Promise<StreamEntry> {
    const entry: StreamEntry = {
      id: crypto.randomUUID(),
      text: input.text,
      tag: input.tag,
      publishedAt: new Date().toISOString(),
      ...(input.link ? { link: input.link } : {}),
    };
    const body = JSON.stringify(entry);
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, entry.id)}`,
      {
        method: "PUT",
        body,
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return entry;
  }

  async list(userId: string): Promise<StreamEntry[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(this.prefix(userId))}`;
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
          throw new Error(
            `R2 GET ${key} failed (${r.status} ${r.statusText})`,
          );
        }
        return (await r.json()) as StreamEntry;
      }),
    );

    return entries.sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async getById(userId: string, id: string): Promise<StreamEntry | null> {
    const res = await this.client.fetch(`${this.base}/${this.key(userId, id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `R2 GET failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return (await res.json()) as StreamEntry;
  }

  async update(
    userId: string,
    id: string,
    patch: NewStreamEntry,
  ): Promise<StreamEntry | null> {
    const current = await this.getById(userId, id);
    if (!current) return null;
    const updated: StreamEntry = {
      ...current,
      text: patch.text,
      tag: patch.tag,
      ...(patch.link ? { link: patch.link } : { link: undefined }),
    };
    const res = await this.client.fetch(`${this.base}/${this.key(userId, id)}`, {
      method: "PUT",
      body: JSON.stringify(updated),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const res = await this.client.fetch(`${this.base}/${this.key(userId, id)}`, {
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
