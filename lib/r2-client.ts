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
    try {
      return await this.client.fetch(input, init);
    } catch (err) {
      if (!isTransientNetworkError(err)) throw err;
      console.warn(
        "[nearstream] R2 transient network error, retrying once:",
        err instanceof Error ? err.message : err,
      );
      return await this.client.fetch(input, init);
    }
  }

  sign(
    input: string | URL,
    init?: Parameters<AwsClient["sign"]>[1],
  ): ReturnType<AwsClient["sign"]> {
    return this.client.sign(input as Parameters<AwsClient["sign"]>[0], init);
  }
}
