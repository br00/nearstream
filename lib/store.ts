import type { NewStreamEntry, StreamEntry } from "@/schemas/stream";
import { R2Store } from "@/lib/r2-store";

export interface Store {
  list(userId: string): Promise<StreamEntry[]>;
  add(userId: string, input: NewStreamEntry): Promise<StreamEntry>;
  delete(userId: string, id: string): Promise<boolean>;
}

class InMemoryStore implements Store {
  private entries = new Map<string, StreamEntry[]>();

  private bucket(userId: string): StreamEntry[] {
    let b = this.entries.get(userId);
    if (!b) {
      b = [];
      this.entries.set(userId, b);
    }
    return b;
  }

  async list(userId: string): Promise<StreamEntry[]> {
    return [...this.bucket(userId)].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async add(userId: string, input: NewStreamEntry): Promise<StreamEntry> {
    const entry: StreamEntry = {
      id: crypto.randomUUID(),
      text: input.text,
      tag: input.tag,
      publishedAt: new Date().toISOString(),
      ...(input.link ? { link: input.link } : {}),
    };
    this.bucket(userId).push(entry);
    return entry;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const b = this.bucket(userId);
    const i = b.findIndex((e) => e.id === id);
    if (i === -1) return false;
    b.splice(i, 1);
    return true;
  }
}

function pickStore(): Store {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] store: R2");
    return new R2Store({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log("[nearstream] store: in-memory (set R2_* env vars for R2)");
  return new InMemoryStore();
}

const globalForStore = globalThis as unknown as { __nearstreamStore?: Store };

export const store: Store = globalForStore.__nearstreamStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__nearstreamStore = store;
}
