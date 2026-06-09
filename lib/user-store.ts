import { R2Client } from "@/lib/r2-client";
import type { User, NewUser } from "@/schemas/user";

// Users live at R2 key `users-meta/{id}.json` — distinct from the per-tenant
// content prefix `users/{id}/...` so a list of tenants doesn't have to walk
// every primitive's keys.

export interface UserStore {
  list(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByHandle(handle: string): Promise<User | null>;
  create(input: NewUser): Promise<User>;
  setHandleAndName(
    id: string,
    handle: string,
    displayName: string,
  ): Promise<User | null>;
  setDisplayName(id: string, displayName: string): Promise<User | null>;
}

const PREFIX = "users-meta/";

class InMemoryUserStore implements UserStore {
  private users: User[] = [];

  async list() {
    return [...this.users].sort((a, b) => a.email.localeCompare(b.email));
  }
  async getById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async getByEmail(email: string) {
    const e = email.toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === e) ?? null;
  }
  async getByHandle(handle: string) {
    return this.users.find((u) => u.handle === handle) ?? null;
  }
  async create(input: NewUser) {
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      handle: "",
      displayName: "",
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }
  async setHandleAndName(id: string, handle: string, displayName: string) {
    const i = this.users.findIndex((u) => u.id === id);
    if (i === -1) return null;
    this.users[i] = { ...this.users[i], handle, displayName };
    return this.users[i];
  }
  async setDisplayName(id: string, displayName: string) {
    const i = this.users.findIndex((u) => u.id === id);
    if (i === -1) return null;
    this.users[i] = { ...this.users[i], displayName };
    return this.users[i];
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2UserStore implements UserStore {
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

  async list(): Promise<User[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(PREFIX)}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(`R2 LIST failed (${listRes.status} ${listRes.statusText})`);
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];
    const users = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(`R2 GET ${key} failed (${r.status})`);
        }
        return (await r.json()) as User;
      }),
    );
    return users.sort((a, b) => a.email.localeCompare(b.email));
  }

  async getById(id: string): Promise<User | null> {
    const res = await this.client.fetch(`${this.base}/${this.key(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`R2 GET failed (${res.status} ${res.statusText})`);
    }
    return (await res.json()) as User;
  }

  async getByEmail(email: string): Promise<User | null> {
    const e = email.toLowerCase();
    const all = await this.list();
    return all.find((u) => u.email.toLowerCase() === e) ?? null;
  }

  async getByHandle(handle: string): Promise<User | null> {
    const all = await this.list();
    return all.find((u) => u.handle === handle) ?? null;
  }

  async create(input: NewUser): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      handle: "",
      displayName: "",
      createdAt: new Date().toISOString(),
    };
    const res = await this.client.fetch(`${this.base}/${this.key(user.id)}`, {
      method: "PUT",
      body: JSON.stringify(user),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT failed (${res.status} ${res.statusText})`);
    }
    return user;
  }

  async setHandleAndName(
    id: string,
    handle: string,
    displayName: string,
  ): Promise<User | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated: User = { ...current, handle, displayName };
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

  async setDisplayName(id: string, displayName: string): Promise<User | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated: User = { ...current, displayName };
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

function pickStore(): UserStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] user-store: R2");
    return new R2UserStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log("[nearstream] user-store: in-memory (set R2_* env vars for R2)");
  return new InMemoryUserStore();
}

const g = globalThis as unknown as { __nearstreamUserStore?: UserStore };
export const userStore: UserStore = g.__nearstreamUserStore ?? pickStore();
if (process.env.NODE_ENV !== "production") g.__nearstreamUserStore = userStore;
