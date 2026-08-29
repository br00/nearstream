import { R2Client } from "@/lib/r2-client";
import type { MusicTrack, NewMusicTrack, MusicPatch } from "@/schemas/music";
import { slugify } from "@/schemas/music";
import { mediaStore } from "@/lib/media-store";

export interface MusicStore {
  list(userId: string): Promise<MusicTrack[]>;
  add(userId: string, input: NewMusicTrack): Promise<MusicTrack>;
  getBySlug(userId: string, slug: string): Promise<MusicTrack | null>;
  /** Updates title + artist + description + visibility. Slug, audio and cover stay. */
  updateBySlug(
    userId: string,
    slug: string,
    patch: MusicPatch,
  ): Promise<MusicTrack | null>;
  deleteBySlug(userId: string, slug: string): Promise<boolean>;
}

class InMemoryMusicStore implements MusicStore {
  private items = new Map<string, MusicTrack[]>();
  private bucket(userId: string): MusicTrack[] {
    let b = this.items.get(userId);
    if (!b) {
      b = [];
      this.items.set(userId, b);
    }
    return b;
  }

  async list(userId: string): Promise<MusicTrack[]> {
    return [...this.bucket(userId)].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async add(userId: string, input: NewMusicTrack): Promise<MusicTrack> {
    const track: MusicTrack = {
      ...input,
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      publishedAt: new Date().toISOString(),
      visibility: input.visibility ?? "public",
    };
    this.bucket(userId).push(track);
    return track;
  }

  async getBySlug(userId: string, slug: string): Promise<MusicTrack | null> {
    return this.bucket(userId).find((t) => t.slug === slug) ?? null;
  }

  async updateBySlug(
    userId: string,
    slug: string,
    patch: MusicPatch,
  ): Promise<MusicTrack | null> {
    const b = this.bucket(userId);
    const i = b.findIndex((t) => t.slug === slug);
    if (i === -1) return null;
    b[i] = {
      ...b[i],
      title: patch.title,
      artist: patch.artist,
      description: patch.description,
      visibility: patch.visibility ?? "public",
    };
    return b[i];
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const b = this.bucket(userId);
    const i = b.findIndex((t) => t.slug === slug);
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

class R2MusicStore implements MusicStore {
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
    return `users/${userId}/library/music/`;
  }

  private key(userId: string, id: string) {
    return `${this.prefix(userId)}${id}.json`;
  }

  async add(userId: string, input: NewMusicTrack): Promise<MusicTrack> {
    const track: MusicTrack = {
      ...input,
      id: crypto.randomUUID(),
      slug: slugify(input.title),
      publishedAt: new Date().toISOString(),
      visibility: input.visibility ?? "public",
    };
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, track.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(track),
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return track;
  }

  async list(userId: string): Promise<MusicTrack[]> {
    const url = `${this.base}/?list-type=2&prefix=${encodeURIComponent(this.prefix(userId))}`;
    const listRes = await this.client.fetch(url);
    if (!listRes.ok) {
      throw new Error(
        `R2 LIST failed (${listRes.status} ${listRes.statusText}): ${await listRes.text()}`,
      );
    }
    const keys = parseListKeys(await listRes.text());
    if (keys.length === 0) return [];

    const tracks = await Promise.all(
      keys.map(async (key) => {
        const r = await this.client.fetch(`${this.base}/${key}`);
        if (!r.ok) {
          throw new Error(`R2 GET ${key} failed (${r.status} ${r.statusText})`);
        }
        return (await r.json()) as MusicTrack;
      }),
    );

    return tracks.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async getBySlug(userId: string, slug: string): Promise<MusicTrack | null> {
    const all = await this.list(userId);
    return all.find((t) => t.slug === slug) ?? null;
  }

  async updateBySlug(
    userId: string,
    slug: string,
    patch: MusicPatch,
  ): Promise<MusicTrack | null> {
    const target = await this.getBySlug(userId, slug);
    if (!target) return null;
    const updated: MusicTrack = {
      ...target,
      title: patch.title,
      artist: patch.artist,
      description: patch.description,
      visibility: patch.visibility ?? "public",
    };
    const res = await this.client.fetch(
      `${this.base}/${this.key(userId, target.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(updated),
        headers: { "content-type": "application/json" },
      },
    );
    if (!res.ok) {
      throw new Error(
        `R2 PUT failed (${res.status} ${res.statusText}): ${await res.text()}`,
      );
    }
    return updated;
  }

  async deleteBySlug(userId: string, slug: string): Promise<boolean> {
    const target = await this.getBySlug(userId, slug);
    if (!target) return false;

    if (mediaStore) {
      // Cascade-purge the audio blob and any cover art, same as inventory
      // does for its images. Media failure is logged, not fatal — an
      // orphaned blob is better than a track that can't be deleted.
      try {
        await mediaStore.deleteImage(target.audio.key);
        if (target.cover) {
          await mediaStore.deleteImage(target.cover.key);
          if (target.cover.thumbKey) {
            await mediaStore.deleteImage(target.cover.thumbKey);
          }
        }
      } catch (err) {
        console.warn(
          "[nearstream] music cascade delete: media delete failed (continuing):",
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

function pickStore(): MusicStore {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] music-store: R2");
    return new R2MusicStore({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
  }
  console.log("[nearstream] music-store: in-memory (set R2_* env vars for R2)");
  return new InMemoryMusicStore();
}

const globalForMusicStore = globalThis as unknown as {
  __nearstreamMusicStore?: MusicStore;
};

export const musicStore: MusicStore =
  globalForMusicStore.__nearstreamMusicStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForMusicStore.__nearstreamMusicStore = musicStore;
}
