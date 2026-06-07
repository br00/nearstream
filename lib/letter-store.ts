import { R2Client } from "@/lib/r2-client";
import type { Letter, NewLetter } from "@/schemas/letter";

export interface LetterStore {
  get(userId: string): Promise<Letter | null>;
  set(userId: string, input: NewLetter): Promise<Letter>;
}

class InMemoryLetterStore implements LetterStore {
  private letters = new Map<string, Letter>();

  async get(userId: string): Promise<Letter | null> {
    return this.letters.get(userId) ?? null;
  }

  async set(userId: string, input: NewLetter): Promise<Letter> {
    const letter: Letter = { ...input, updatedAt: new Date().toISOString() };
    this.letters.set(userId, letter);
    return letter;
  }
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2LetterStore implements LetterStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  private key(userId: string) {
    return `users/${userId}/site/letter.json`;
  }

  async get(userId: string): Promise<Letter | null> {
    const res = await this.client.fetch(`${this.base}/${this.key(userId)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `R2 GET letter failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return (await res.json()) as Letter;
  }

  async set(userId: string, input: NewLetter): Promise<Letter> {
    const letter: Letter = { ...input, updatedAt: new Date().toISOString() };
    const res = await this.client.fetch(`${this.base}/${this.key(userId)}`, {
      method: "PUT",
      body: JSON.stringify(letter),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `R2 PUT letter failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return letter;
  }
}

function pickStore(): LetterStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] letter-store: R2");
    return new R2LetterStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log("[nearstream] letter-store: in-memory (set R2_* env vars for R2)");
  return new InMemoryLetterStore();
}

const globalForLetterStore = globalThis as unknown as {
  __nearstreamLetterStore?: LetterStore;
};

export const letterStore: LetterStore =
  globalForLetterStore.__nearstreamLetterStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForLetterStore.__nearstreamLetterStore = letterStore;
}
