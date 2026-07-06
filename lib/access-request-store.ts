// Store for pending / reviewed access requests. Records live at
// `access-requests/{id}.json` in R2 so approves + denies don't race and
// the queue is trivial to list. Each record carries its full lifecycle:
// requestedAt, status, reviewedAt, reviewedBy. No delete — reviewed
// records stay as an audit log the host can browse.

import { R2Client } from "@/lib/r2-client";
import type {
  AccessRequest,
  AccessRequestStatus,
  NewAccessRequest,
} from "@/schemas/access-request";
import { normalizeEmail } from "@/lib/auth";

const PREFIX = "access-requests/";

export interface AccessRequestStore {
  create(input: NewAccessRequest): Promise<AccessRequest>;
  get(id: string): Promise<AccessRequest | null>;
  list(filter?: { status?: AccessRequestStatus }): Promise<AccessRequest[]>;
  findByEmail(email: string): Promise<AccessRequest[]>;
  setStatus(
    id: string,
    status: AccessRequestStatus,
    reviewedBy: string,
  ): Promise<AccessRequest | null>;
}

class InMemoryAccessRequestStore implements AccessRequestStore {
  private records = new Map<string, AccessRequest>();

  async create(input: NewAccessRequest): Promise<AccessRequest> {
    const rec: AccessRequest = {
      id: crypto.randomUUID(),
      email: normalizeEmail(input.email),
      message: input.message,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    this.records.set(rec.id, rec);
    return rec;
  }
  async get(id: string) {
    return this.records.get(id) ?? null;
  }
  async list(filter?: { status?: AccessRequestStatus }) {
    let all = Array.from(this.records.values());
    if (filter?.status) all = all.filter((r) => r.status === filter.status);
    return all.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }
  async findByEmail(email: string) {
    const e = normalizeEmail(email);
    return Array.from(this.records.values()).filter((r) => r.email === e);
  }
  async setStatus(id: string, status: AccessRequestStatus, reviewedBy: string) {
    const rec = this.records.get(id);
    if (!rec) return null;
    const updated: AccessRequest = {
      ...rec,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    };
    this.records.set(id, updated);
    return updated;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2AccessRequestStore implements AccessRequestStore {
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
    return `${PREFIX}${id}.json`;
  }

  async create(input: NewAccessRequest): Promise<AccessRequest> {
    const rec: AccessRequest = {
      id: crypto.randomUUID(),
      email: normalizeEmail(input.email),
      message: input.message,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    const res = await this.client.fetch(`${this.base}/${this.key(rec.id)}`, {
      method: "PUT",
      body: JSON.stringify(rec),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT failed (${res.status} ${res.statusText})`);
    }
    return rec;
  }

  async get(id: string): Promise<AccessRequest | null> {
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 GET failed (${res.status})`);
    return (await res.json()) as AccessRequest;
  }

  async list(filter?: { status?: AccessRequestStatus }): Promise<AccessRequest[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(PREFIX)}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText})`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];
    let records = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) throw new Error(`R2 GET ${key} failed (${r.status})`);
        return (await r.json()) as AccessRequest;
      }),
    );
    if (filter?.status) {
      records = records.filter((r) => r.status === filter.status);
    }
    return records.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  async findByEmail(email: string): Promise<AccessRequest[]> {
    const e = normalizeEmail(email);
    // We don't index by email; small volume + tolerable full scan.
    const all = await this.list();
    return all.filter((r) => r.email === e);
  }

  async setStatus(
    id: string,
    status: AccessRequestStatus,
    reviewedBy: string,
  ): Promise<AccessRequest | null> {
    const current = await this.get(id);
    if (!current) return null;
    const updated: AccessRequest = {
      ...current,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    };
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`, {
      method: "PUT",
      body: JSON.stringify(updated),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT failed (${res.status} ${res.statusText})`);
    }
    return updated;
  }
}

function parseListKeys(xml: string): string[] {
  const out: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function pickStore(): AccessRequestStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] access-request-store: R2");
    return new R2AccessRequestStore({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
  }
  console.log(
    "[nearstream] access-request-store: in-memory (set R2_* env vars for R2)",
  );
  return new InMemoryAccessRequestStore();
}

const g = globalThis as unknown as { __nearstreamAccessRequestStore?: AccessRequestStore };
export const accessRequestStore: AccessRequestStore =
  g.__nearstreamAccessRequestStore ?? pickStore();
if (process.env.NODE_ENV !== "production") g.__nearstreamAccessRequestStore = accessRequestStore;
