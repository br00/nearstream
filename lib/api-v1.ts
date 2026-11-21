// Shared plumbing for the app API (`app/api/v1/*`, docs/app/API.md):
// bearer-token auth, the error envelope, opaque ids, cursors, and small
// in-memory rate limits.

import { lookupDeviceToken, type DeviceAuth } from "@/lib/app-auth";
import { userStore } from "@/lib/user-store";
import type { User } from "@/schemas/user";

// ─── responses ───────────────────────────────────────────────────────

export type ErrorCode =
  | "invalid"
  | "unauthorized"
  | "onboarding_required"
  | "not_found"
  | "conflict"
  | "slow_down"
  | "server";

const NO_STORE = { "cache-control": "private, no-store" };

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { field?: string; retryAfterSeconds?: number } = {},
): Response {
  const headers: Record<string, string> = { ...NO_STORE };
  if (extra.retryAfterSeconds !== undefined) {
    headers["retry-after"] = String(Math.max(1, Math.ceil(extra.retryAfterSeconds)));
  }
  return Response.json(
    { error: { code, message, ...(extra.field ? { field: extra.field } : {}) } },
    { status, headers },
  );
}

export const invalid = (field: string, message: string) =>
  apiError(400, "invalid", message, { field });
export const notFound = (message = "Not found.") => apiError(404, "not_found", message);

export function ok(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** Wrap a route handler so a thrown error becomes the `server` envelope
 *  rather than Next's HTML error page. Logs the path only — never the
 *  body or headers, which may carry codes or tokens. */
export function v1<C>(
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error(
        `[api/v1] ${request.method} ${new URL(request.url).pathname} failed:`,
        err instanceof Error ? err.message : err,
      );
      return apiError(500, "server", "Something went wrong on the server.");
    }
  };
}

/** Parse a JSON object body, or answer 400. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return apiError(400, "invalid", "Body must be a JSON object.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return apiError(400, "invalid", "Body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

// ─── auth ────────────────────────────────────────────────────────────

export type Authed = { user: User; device: DeviceAuth };

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** The token's user, or a 401 to return as-is. `needsHandle` (the default)
 *  also requires finished onboarding — everything but /me and /devices
 *  acts as someone with a site. */
export async function requireUser(
  request: Request,
  { needsHandle = true }: { needsHandle?: boolean } = {},
): Promise<Authed | Response> {
  const token = bearerToken(request);
  if (!token) return apiError(401, "unauthorized", "Missing bearer token.");
  const device = await lookupDeviceToken(token);
  if (!device) return apiError(401, "unauthorized", "Token is not valid.");
  const user = await userStore.getById(device.userId);
  if (!user) return apiError(401, "unauthorized", "Token is not valid.");
  if (needsHandle && !user.handle) {
    return apiError(403, "onboarding_required", "Finish setting up your site on the web first.");
  }
  return { user, device };
}

// ─── opaque ids ──────────────────────────────────────────────────────

// Every id the API hands out carries a short type prefix so the app (and
// a person reading logs) can tell them apart. The part after the prefix
// is the store's own id; the app must still treat the whole thing as an
// opaque string.
export type IdPrefix = "u" | "ln" | "fe" | "fr" | "pd" | "sh";

export const toId = (prefix: IdPrefix, raw: string) => `${prefix}_${raw}`;

export function fromId(prefix: IdPrefix, id: string): string | null {
  const p = `${prefix}_`;
  if (!id.startsWith(p)) return null;
  const raw = id.slice(p.length);
  return /^[A-Za-z0-9_-]{1,128}$/.test(raw) ? raw : null;
}

// ─── pagination ──────────────────────────────────────────────────────

type Cursor = { t: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (c && typeof c.t === "string" && typeof c.id === "string") return c;
  } catch {
    // fall through
  }
  return null;
}

/** Newest first, ties broken by id, so a cursor is a stable position even
 *  when two items share a timestamp. */
function compareDesc(a: Cursor, b: Cursor): number {
  if (a.t !== b.t) return a.t < b.t ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export type Page<T> = { items: T[]; next: string | null };

/** Page through `rows` by `?limit` and `?before`. `key` gives each row's
 *  (publishedAt, id). Returns a 400 for a bad limit or cursor. */
export function paginate<T>(
  url: URL,
  rows: T[],
  key: (row: T) => Cursor,
): Page<T> | Response {
  const rawLimit = url.searchParams.get("limit");
  let limit = 30;
  if (rawLimit !== null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return invalid("limit", "limit must be an integer from 1 to 100.");
    }
    limit = n;
  }
  const rawBefore = url.searchParams.get("before");
  let before: Cursor | null = null;
  if (rawBefore) {
    before = decodeCursor(rawBefore);
    if (!before) return invalid("before", "Unknown cursor.");
  }

  const sorted = [...rows].sort((a, b) => compareDesc(key(a), key(b)));
  const start = before ? sorted.filter((r) => compareDesc(key(r), before) > 0) : sorted;
  const items = start.slice(0, limit);
  const next = start.length > limit ? encodeCursor(key(items[items.length - 1])) : null;
  return { items, next };
}

// ─── rate limits ─────────────────────────────────────────────────────

/** A fixed-window counter per key. In memory, per process — like the
 *  doorbell's limit, it blunts a flood rather than counting precisely. */
export class RateLimit {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  /** Seconds to wait, or 0 if this hit is allowed (and counted). */
  hit(key: string): number {
    const now = Date.now();
    const row = this.hits.get(key);
    if (!row || row.resetAt <= now) {
      if (this.hits.size > 10_000) this.hits.clear();
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return 0;
    }
    if (row.count >= this.max) return (row.resetAt - now) / 1000;
    row.count += 1;
    return 0;
  }
}

/** Best-effort client IP: the first `x-forwarded-for` hop, as set by the
 *  platform's proxy. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
