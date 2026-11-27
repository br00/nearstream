// Nearstream Protocol v0.1 — the wire-level pieces (PROTOCOL.md §3, §6).
//
// Everything here is about *other* servers: what an address is, how to
// look one up, how to ring a doorbell. What *this* server publishes lives
// in the routes under `app/[handle]/` (.well-known, feed/[token], doorbell).

import type { User } from "@/schemas/user";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";

export const PROTOCOL_VERSION = "nearstream/0.1";

/** User-agent for every server-to-server request. */
export const PROTOCOL_USER_AGENT = "Nearstream/0.1 (+https://nearstream.app)";

/** The discovery document at `{address}/.well-known/nearstream` (§3). */
export type DiscoveryDoc = {
  protocol: string;
  address: string;
  name: string;
  mark?: string;
  feed: string;
  doorbell: string;
  keys: string;
  /** App API base (docs/app/API.md §1). Optional; servers don't parse it. */
  api?: string;
};

/** Doorbell rings (§6). Content-free by design. */
export type Ring =
  | { ring: "share"; from: string; key: string }
  | { ring: "new"; from: string };

// ─── Instance + addresses ─────────────────────────────────────────────

/** This instance's base URL, no trailing slash. */
export function instanceUrl(): string {
  return (process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Plain `http` is only allowed when explicitly switched on, for the local
 *  two-instance lab (`npm run lab`). Production speaks https only. */
function allowHttp(): boolean {
  return process.env.NEARSTREAM_PROTOCOL_ALLOW_HTTP === "1";
}

/** Absolute site URL for a user: custom domain when they have one,
 *  `{instance}/{handle}` otherwise. */
export function siteUrlFor(user: Pick<User, "handle">): string {
  return tenantAbsoluteBase(user.handle ?? "", instanceUrl());
}

/** A site URL minus its scheme — what people type and what servers store.
 *  `https://nearstream.app/gosia/` → `nearstream.app/gosia`. Host is
 *  lowercased, a leading `www.` and any trailing slash are dropped. */
export function addressFromUrl(url: string): string {
  const u = new URL(url);
  const host = u.host.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  return `${host}${path}`;
}

export function addressOf(user: Pick<User, "handle">): string {
  return addressFromUrl(siteUrlFor(user));
}

/** Normalise whatever someone typed — `Nearstream.app/gosia/`,
 *  `https://nearstream.app/gosia` — into a canonical address, or null if it
 *  can't be one. */
export function normalizeAddress(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.search || u.hash || u.username || u.password) return null;
    return addressFromUrl(u.toString());
  } catch {
    return null;
  }
}

/** The URL scheme to use when talking to an address. */
function schemeFor(): "https" | "http" {
  return allowHttp() ? "http" : "https";
}

export function urlForAddress(address: string, path = ""): string {
  return `${schemeFor()}://${address}${path}`;
}

/** True when `url` is one this server may fetch or ring: https always,
 *  http only in the lab. */
export function isProtocolUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (allowHttp() && u.protocol === "http:");
  } catch {
    return false;
  }
}

/** True when `keyUrl` is a key that `address` issued: exactly one token
 *  under `{address}/feed/`, compared as parsed URLs.
 *
 *  The prefix comes from the address, never from the sender's own
 *  `.well-known` — a document can claim any `keys` prefix, so trusting it
 *  let a stranger pass on a key someone else gave them and have it show up
 *  under their name. A plain `startsWith` is also not enough: friends on one
 *  instance share a host (`nearstream.app/gosia`, `nearstream.app/mallory`),
 *  and `https://a.com` is a string prefix of `https://a.com.evil.com`. */
export function isKeyFrom(address: string, keyUrl: string): boolean {
  if (!isProtocolUrl(keyUrl)) return false;
  let key: URL;
  let prefix: URL;
  try {
    key = new URL(keyUrl);
    prefix = new URL(urlForAddress(address, "/feed/"));
  } catch {
    return false;
  }
  if (key.username || key.password || key.search || key.hash) return false;
  if (key.protocol !== prefix.protocol) return false;
  // Same normalisation as addresses: case-insensitive, `www.` optional.
  const host = (u: URL) => u.host.toLowerCase().replace(/^www\./, "");
  if (host(key) !== host(prefix)) return false;
  if (!key.pathname.startsWith(prefix.pathname)) return false;
  return KEY_TOKEN.test(key.pathname.slice(prefix.pathname.length));
}

/** One path segment of base64url — what `newToken()` mints, with room for
 *  other servers' token formats. No slashes, so no `media/…` or `../`. */
const KEY_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

// ─── Talking to other servers ─────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;

/** Response size caps. A stranger's server chooses what it sends back, so
 *  nothing it returns is read without a limit. */
export const MAX_DISCOVERY_BYTES = 64 * 1024;
export const MAX_FEED_BYTES = 5 * 1024 * 1024;

/** `res.text()` with a ceiling: null once the body passes `maxBytes`, and
 *  the rest is never downloaded. */
export async function readTextCapped(res: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > maxBytes) {
    await res.body?.cancel();
    return null;
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

function protocolFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { "user-agent": PROTOCOL_USER_AGENT, ...(init.headers ?? {}) },
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** Look an address up (§3). Returns null when there's no Nearstream there
 *  or the document is malformed — callers treat both the same. */
export async function discover(address: string): Promise<DiscoveryDoc | null> {
  let res: Response;
  try {
    res = await protocolFetch(urlForAddress(address, "/.well-known/nearstream"), {
      headers: { accept: "application/json" },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let doc: unknown;
  try {
    const text = await readTextCapped(res, MAX_DISCOVERY_BYTES);
    if (text === null) return null;
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  return parseDiscoveryDoc(doc, address);
}

function parseDiscoveryDoc(raw: unknown, expectedAddress: string): DiscoveryDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : null);
  const protocol = str("protocol");
  const address = str("address");
  const name = str("name");
  const feed = str("feed");
  const doorbell = str("doorbell");
  const keys = str("keys");
  if (!protocol?.startsWith("nearstream/")) return null;
  if (!address || !name || !feed || !doorbell || !keys) return null;
  // The document must describe the address we asked about — a server can't
  // answer for someone else.
  if (normalizeAddress(address) !== expectedAddress) return null;
  if (![feed, doorbell, keys].every(isProtocolUrl)) return null;
  const mark = str("mark");
  return { protocol, address: expectedAddress, name, feed, doorbell, keys, ...(mark ? { mark } : {}) };
}

/** Ring a doorbell (§6). Fire-and-forget: the answer is always 202, and a
 *  lost ring is covered by polling, so failures are logged, not thrown. */
export async function ring(doorbellUrl: string, body: Ring): Promise<boolean> {
  if (!isProtocolUrl(doorbellUrl)) return false;
  try {
    const res = await protocolFetch(doorbellUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.status === 202;
  } catch (err) {
    console.warn(`[protocol] ring ${body.ring} → ${doorbellUrl} failed`, err);
    return false;
  }
}

/** Fetch a key URL and check it answers with a feed (§6 share step 3). */
export async function keyAnswers(keyUrl: string): Promise<boolean> {
  try {
    const res = await protocolFetch(keyUrl, {
      headers: { accept: "application/rss+xml" },
    });
    if (!res.ok) return false;
    const body = await readTextCapped(res, MAX_FEED_BYTES);
    return body !== null && body.includes("<rss") && body.includes("<channel>");
  } catch {
    return false;
  }
}
