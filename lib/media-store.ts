import { R2Client } from "@/lib/r2-client";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Audio (slice 39). MediaRecorder emits webm/opus on Chromium + Android,
  // mp4/aac on Safari. We store what the browser gives us — playback is via
  // `<audio>` on the same browser, so format compatibility is a non-issue.
  "audio/webm",
  "audio/mp4",
  // Uploaded music (slice 40). Wider than the recorder set because these are
  // files the user already has rather than something we produced. Several
  // have more than one content-type in the wild — browsers and operating
  // systems disagree about m4a, wav and flac — so each accepted spelling is
  // listed rather than normalized, and the file is stored exactly as sent.
  "audio/mpeg",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export function isAllowedContentType(value: unknown): value is AllowedType {
  return (
    typeof value === "string" &&
    (ALLOWED_TYPES as readonly string[]).includes(value)
  );
}

// Audio-only variant of the same check. Used by the stream upload-url
// route so a caller can't sneak an image PUT through the audio endpoint
// (or vice versa via the inventory endpoint).
//
// Deliberately still just the two recorder formats: the voice endpoint
// accepts what MediaRecorder produces, and nothing else. Widening it to the
// music set would let a 20MB mp3 in through the 60-second voice path.
const AUDIO_TYPES: readonly AllowedType[] = ["audio/webm", "audio/mp4"];
export function isAllowedAudioType(value: unknown): value is AllowedType {
  return (
    typeof value === "string" &&
    (AUDIO_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Uploaded-music variant (slice 40). Includes the recorder formats too —
 * a webm the user exported from somewhere else is a legitimate upload —
 * but not images, which go through the inventory endpoint.
 */
const MUSIC_AUDIO_TYPES: readonly AllowedType[] = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/webm",
];
export function isAllowedMusicAudioType(value: unknown): value is AllowedType {
  return (
    typeof value === "string" &&
    (MUSIC_AUDIO_TYPES as readonly string[]).includes(value)
  );
}

function extOf(contentType: AllowedType): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "audio/webm":
      return "webm";
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/aac":
      return "aac";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/flac":
    case "audio/x-flac":
      return "flac";
    case "audio/ogg":
      return "ogg";
  }
}

const UPLOAD_EXPIRES_SECONDS = 300;

export interface MediaStore {
  getUploadUrl(
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string; expiresInSeconds: number }>;
  getImage(key: string): Promise<Response>;
  deleteImage(key: string): Promise<boolean>;
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

class R2MediaStore implements MediaStore {
  private client: R2Client;
  private base: string;

  constructor(config: R2Config) {
    this.client = new R2Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  }

  async getUploadUrl(contentType: string) {
    if (!isAllowedContentType(contentType)) {
      throw new Error(`unsupported content-type: ${contentType}`);
    }
    const key = `${crypto.randomUUID()}.${extOf(contentType)}`;
    const url = new URL(`${this.base}/${R2_PREFIX}${key}`);
    url.searchParams.set("X-Amz-Expires", String(UPLOAD_EXPIRES_SECONDS));

    const signed = await this.client.sign(url.toString(), {
      method: "PUT",
      headers: { "content-type": contentType },
      aws: { signQuery: true },
    });

    return {
      uploadUrl: signed.url,
      key,
      expiresInSeconds: UPLOAD_EXPIRES_SECONDS,
    };
  }

  async getImage(key: string): Promise<Response> {
    if (key.includes("/") || key.includes("..") || key.length === 0) {
      return new Response("not found", { status: 404 });
    }
    const res = await this.client.fetch(`${this.base}/${R2_PREFIX}${key}`);
    if (!res.ok) {
      return new Response("not found", { status: 404 });
    }
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  async deleteImage(key: string): Promise<boolean> {
    if (key.includes("/") || key.includes("..") || key.length === 0) {
      return false;
    }
    const res = await this.client.fetch(`${this.base}/${R2_PREFIX}${key}`, {
      method: "DELETE",
    });
    if (res.status === 204) return true;
    if (res.status === 404) return false;
    throw new Error(
      `R2 DELETE failed (${res.status} ${res.statusText}): ${await res.text()}`,
    );
  }
}

const R2_PREFIX = "media/";

function pickStore(): MediaStore | null {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    console.log("[nearstream] media-store: R2");
    return new R2MediaStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  console.log(
    "[nearstream] media-store: disabled (R2_* env vars required for media uploads)",
  );
  return null;
}

const globalForMediaStore = globalThis as unknown as {
  __nearstreamMediaStore?: MediaStore | null;
};

export const mediaStore: MediaStore | null =
  globalForMediaStore.__nearstreamMediaStore ?? pickStore();

if (process.env.NODE_ENV !== "production") {
  globalForMediaStore.__nearstreamMediaStore = mediaStore;
}
