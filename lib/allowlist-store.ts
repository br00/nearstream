// Persisted allowlist — extends the env-var `ALLOWED_EMAILS` list. The
// env list is the "seed" that ships with the instance; this store is
// what the host grows over time by approving access requests. Both are
// consulted by `isEmailAllowed` in lib/auth.ts.
//
// Storage: `allowlist/{normalized-email}.json` in R2. One file per
// approved email so approves don't race and revokes are a plain DELETE.
// The stored JSON carries `approvedAt` + the requestId that produced it,
// so the queue and the allowlist stay auditable.

import { R2Client } from "@/lib/r2-client";
import { normalizeEmail } from "@/lib/auth";

const PREFIX = "allowlist/";

export type AllowlistEntry = {
  email: string;
  approvedAt: string;
  /** Optional link back to the AccessRequest that produced the entry.
   *  Seed approvals (env-var list) leave this unset. */
  fromRequestId?: string;
};

export interface AllowlistStore {
  has(email: string): Promise<boolean>;
  list(): Promise<AllowlistEntry[]>;
  add(entry: AllowlistEntry): Promise<void>;
  remove(email: string): Promise<boolean>;
}

// safe filename: 'user@example.com' → 'user_at_example.com'. R2 keys
// accept @ fine but this keeps them URL-friendly for admin tooling.
function keyFor(email: string): string {
  const safe = normalizeEmail(email).replace("@", "_at_");
  return `${PREFIX}${safe}.json`;
}

class InMemoryAllowlistStore implements AllowlistStore {
  private entries = new Map<string, AllowlistEntry>();

  async has(email: string) {
    return this.entries.has(normalizeEmail(email));
  }
  async list() {
    return Array.from(this.entries.values()).sort((a, b) =>
      a.email.localeCompare(b.email),
    );
  }
  async add(entry: AllowlistEntry) {
    this.entries.set(normalizeEmail(entry.email), {
      ...entry,
      email: normalizeEmail(entry.email),
    });
  }
  async remove(email: string) {
    return this.entries.delete(normalizeEmail(email));
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2AllowlistStore implements AllowlistStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  async has(email: string): Promise<boolean> {
    const res = await this.client.fetch(`${this.base}/${keyFor(email)}`, {
      method: "HEAD",
    });
    return res.ok;
  }

  async list(): Promise<AllowlistEntry[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(PREFIX)}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText})`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];
    const entries = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) throw new Error(`R2 GET ${key} failed (${r.status})`);
        return (await r.json()) as AllowlistEntry;
      }),
    );
    return entries.sort((a, b) => a.email.localeCompare(b.email));
  }

  async add(entry: AllowlistEntry): Promise<void> {
    const normalized: AllowlistEntry = {
      ...entry,
      email: normalizeEmail(entry.email),
    };
    const res = await this.client.fetch(
      `${this.base}/${keyFor(normalized.email)}`,
      {
        method: "PUT",
        body: JSON.stringify(normalized),
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(`R2 PUT failed (${res.status} ${res.statusText})`);
    }
  }

  async remove(email: string): Promise<boolean> {
    const res = await this.client.fetch(`${this.base}/${keyFor(email)}`, {
      method: "DELETE",
    });
    if (res.status === 204) return true;
    if (res.status === 404) return false;
    throw new Error(`R2 DELETE failed (${res.status} ${res.statusText})`);
  }
}

function parseListKeys(xml: string): string[] {
  const out: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function pickStore(): AllowlistStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] allowlist-store: R2");
    return new R2AllowlistStore({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
  }
  console.log(
    "[nearstream] allowlist-store: in-memory (set R2_* env vars for R2)",
  );
  return new InMemoryAllowlistStore();
}

const g = globalThis as unknown as { __nearstreamAllowlistStore?: AllowlistStore };
export const allowlistStore: AllowlistStore =
  g.__nearstreamAllowlistStore ?? pickStore();
if (process.env.NODE_ENV !== "production") g.__nearstreamAllowlistStore = allowlistStore;
