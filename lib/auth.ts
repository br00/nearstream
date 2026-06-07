import { cookies } from "next/headers";

const SESSION_COOKIE = "nearstream_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAGIC_LINK_TTL_SECONDS = 15 * 60;

type TokenPurpose = "magic" | "session";

interface MagicTokenPayload {
  email: string;
  exp: number;
  purpose: "magic";
}

interface SessionTokenPayload {
  email: string;
  userId: string;
  exp: number;
  purpose: "session";
}

type TokenPayload = MagicTokenPayload | SessionTokenPayload;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is required and must be at least 32 chars. Run `openssl rand -base64 32` and put it in .env.local.",
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return new Uint8Array(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function signToken(payload: TokenPayload): Promise<string> {
  const body = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const sig = base64UrlEncode(await hmac(body));
  return `${body}.${sig}`;
}

async function verifyToken<T extends TokenPurpose>(
  token: string,
  purpose: T,
): Promise<(T extends "magic" ? MagicTokenPayload : SessionTokenPayload) | null> {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(body);
  let provided: Uint8Array;
  try {
    provided = base64UrlDecode(sig);
  } catch {
    return null;
  }
  if (!constantTimeEqual(expected, provided)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  } catch {
    return null;
  }

  if (payload.purpose !== purpose) return null;
  if (typeof payload.exp !== "number" || payload.exp < nowSeconds()) return null;
  if (typeof payload.email !== "string" || payload.email.length === 0) return null;
  if (purpose === "session" && typeof (payload as SessionTokenPayload).userId !== "string") {
    return null;
  }

  // Type assertion is safe — purpose narrowing handled above.
  return payload as T extends "magic" ? MagicTokenPayload : SessionTokenPayload;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isEmailAllowed(email: string): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return list.includes(normalizeEmail(email));
}

/** True if the given email matches the configured instance host. */
export function isHostEmail(email: string): boolean {
  const host = process.env.HOST_USER_EMAIL;
  if (!host) return false;
  return normalizeEmail(host) === normalizeEmail(email);
}

export async function createMagicLinkToken(email: string): Promise<string> {
  return signToken({
    email: normalizeEmail(email),
    exp: nowSeconds() + MAGIC_LINK_TTL_SECONDS,
    purpose: "magic",
  });
}

export async function consumeMagicLinkToken(
  token: string,
): Promise<string | null> {
  const payload = await verifyToken(token, "magic");
  return payload?.email ?? null;
}

export async function createSession(
  userId: string,
  email: string,
): Promise<void> {
  const token = await signToken({
    userId,
    email: normalizeEmail(email),
    exp: nowSeconds() + SESSION_TTL_SECONDS,
    purpose: "session",
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type Session = { userId: string; email: string };

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, "session");
  return payload ? { userId: payload.userId, email: payload.email } : null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
