import { R2Client } from "@/lib/r2-client";
import type { Letter, NewLetter } from "@/schemas/letter";

export interface LetterStore {
  get(): Promise<Letter | null>;
  set(input: NewLetter): Promise<Letter>;
}

class InMemoryLetterStore implements LetterStore {
  private letter: Letter | null = null;

  async get(): Promise<Letter | null> {
    return this.letter;
  }

  async set(input: NewLetter): Promise<Letter> {
    this.letter = { ...input, updatedAt: new Date().toISOString() };
    return this.letter;
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

  private key() {
    // Site-config namespace (vs. content primitive prefixes like
    // `entries/`, `library/essays/`, etc.). One record only.
    return "site/letter.json";
  }

  async get(): Promise<Letter | null> {
    const res = await this.client.fetch(`${this.base}/${this.key()}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `R2 GET letter failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return (await res.json()) as Letter;
  }

  async set(input: NewLetter): Promise<Letter> {
    const letter: Letter = { ...input, updatedAt: new Date().toISOString() };
    const res = await this.client.fetch(`${this.base}/${this.key()}`, {
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
