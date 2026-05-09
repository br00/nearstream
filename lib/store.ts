import type { NewStreamEntry, StreamEntry } from "@/schemas/stream";

export interface Store {
  list(): Promise<StreamEntry[]>;
  add(input: NewStreamEntry): Promise<StreamEntry>;
}

class InMemoryStore implements Store {
  private entries: StreamEntry[] = [];

  async list(): Promise<StreamEntry[]> {
    return [...this.entries].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async add(input: NewStreamEntry): Promise<StreamEntry> {
    const entry: StreamEntry = {
      id: crypto.randomUUID(),
      text: input.text,
      tag: input.tag,
      publishedAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }
}

const globalForStore = globalThis as unknown as { __nearstreamStore?: Store };

export const store: Store =
  globalForStore.__nearstreamStore ?? new InMemoryStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__nearstreamStore = store;
}
