import { R2Client } from "@/lib/r2-client";
import type { Essay, NewEssay } from "@/schemas/essay";
import { slugify } from "@/schemas/essay";

export interface EssayStore {
  list(userId: string): Promise<Essay[]>;
  add(userId: string, input: NewEssay): Promise<Essay>;
  getBySlug(userId: string, slug: string): Promise<Essay | null>;
  deleteBySlug(userId: string, slug: string): Promise<boolean>;
}

class InMemoryEssayStore implements EssayStore {
  private essays = new Map<string, Essay[]>();
  private bucket(userId: string): Essay[] {
    let b = this.essays.get(userId);
    if (!b) {
      b = [];
      this.essays.set(userId, b);
    }
    return b;
  }

  async list(userId: string): Promise<Essay[]> {
    return [...this.bucket(userId)].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async add(userId: string, input: NewEssay): Promise<Essay> {
    const essay: Essay = {
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      title: input.title,
      body: input.body,
      publishedAt: new Date().toISOString(),
    };
    this.bucket(userId).push(essay);
    return essay;
  }

  async getBySlug(userId: string, slug: string): Promise<Essay | null> {
    return this.bucket(userId).find((e) => e.slug === slug) ?? null;
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const b = this.bucket(userId);
    const i = b.findIndex((e) => e.slug === slug);
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

class R2EssayStore implements EssayStore {
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
    return `users/${userId}/library/essays/`;
  }

  private key(userId: string, id: string) {
    return `${this.prefix(userId)}${id}.json`;
  }

  async add(userId: string, input: NewEssay): Promise<Essay> {
    const essay: Essay = {
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      title: input.title,
      body: input.body,
      publishedAt: new Date().toISOString(),
    };
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, essay.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(essay),
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return essay;
  }

  async list(userId: string): Promise<Essay[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(this.prefix(userId))}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText}): ${await listRes.text()}`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];

    const essays = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(
            `R2 GET ${key} failed (${r.status} ${r.statusText})`,
          );
        }
        return (await r.json()) as Essay;
      }),
    );

    return essays.sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async getBySlug(userId: string, slug: string): Promise<Essay | null> {
    const all = await this.list(userId);
    return all.find((e) => e.slug === slug) ?? null;
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const target = await this.getBySlug(userId, slug);
    if (!target) return false;
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, target.id)}`,
      {
        method: "DELETE",
      },
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

function pickStore(): EssayStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] essay-store: R2");
    return new R2EssayStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log("[nearstream] essay-store: in-memory (set R2_* env vars for R2)");
  return new InMemoryEssayStore();
}

const globalForEssayStore = globalThis as unknown as {
  __nearstreamEssayStore?: EssayStore;
};

export const essayStore: EssayStore =
  globalForEssayStore.__nearstreamEssayStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForEssayStore.__nearstreamEssayStore = essayStore;
}
