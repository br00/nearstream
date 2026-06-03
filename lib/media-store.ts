import { R2Client } from "@/lib/r2-client";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export function isAllowedContentType(value: unknown): value is AllowedType {
  return (
    typeof value === "string" &&
    (ALLOWED_TYPES as readonly string[]).includes(value)
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
  }
}

const UPLOAD_EXPIRES_SECONDS = 300;

export interface MediaStore {
  getUploadUrl(
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string; expiresInSeconds: number }>;
  getImage(key: string): Promise<Response>;
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
