import { AwsClient } from "aws4fetch";

const TRANSIENT_ERROR_FRAGMENTS = [
  "ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE",
  "SSL_ALERT",
  "SSLV3_ALERT",
  "handshake failure",
  "TLSV1_ALERT",
  "ECONNRESET",
  "EPROTO",
] as const;

function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const direct = err.message;
  const cause =
    err.cause instanceof Error ? err.cause.message : "";
  const haystack = `${direct} ${cause}`;
  return TRANSIENT_ERROR_FRAGMENTS.some((f) => haystack.includes(f));
}

// R2 rejects PUTs without `Content-Length` with `411 Length Required`. Node's
// fetch (undici) defaults to `Transfer-Encoding: chunked` for string and
// Uint8Array bodies on PUT/POST, which R2 doesn't accept. Compute the byte
// length up-front and add it to `init.headers` *before* aws4fetch signs the
// request, so the signed-headers list includes content-length.
function withContentLength(init?: RequestInit): RequestInit | undefined {
  if (!init || init.body == null) return init;
  const method = init.method?.toUpperCase();
  if (method !== "PUT" && method !== "POST") return init;

  const headers = new Headers(init.headers ?? {});
  if (headers.has("content-length")) return init;

  let bytes: number | undefined;
  const body = init.body;
  if (typeof body === "string") {
    bytes = new TextEncoder().encode(body).length;
  } else if (body instanceof Uint8Array) {
    bytes = body.byteLength;
  } else if (body instanceof ArrayBuffer) {
    bytes = body.byteLength;
  }
  // Streams, FormData, Blob, etc. fall through — we don't know the length
  // without consuming the body. None of those shapes are used in our R2
  // call sites today; revisit if that changes.
  if (bytes == null) return init;

  headers.set("content-length", String(bytes));
  return { ...init, headers };
}

type R2ClientConfig = {
  accessKeyId: string;
  secretAccessKey: string;
};

export class R2Client {
  private client: AwsClient;

  constructor(config: R2ClientConfig) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    });
  }

  async fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const patched = withContentLength(init);
    try {
      return await this.client.fetch(input, patched);
    } catch (err) {
      if (!isTransientNetworkError(err)) throw err;
      console.warn(
        "[nearstream] R2 transient network error, retrying once:",
        err instanceof Error ? err.message : err,
      );
      return await this.client.fetch(input, patched);
    }
  }

  sign(
    input: string | URL,
    init?: Parameters<AwsClient["sign"]>[1],
  ): ReturnType<AwsClient["sign"]> {
    return this.client.sign(input as Parameters<AwsClient["sign"]>[0], init);
  }
}
