// Sign-in for the native app (docs/app/API.md §2): one-time codes and
// device tokens. The web keeps its signed-cookie sessions (lib/auth.ts);
// this is the app's parallel path, sharing the same allowlist and email.
//
// Storage, all via lib/json-collection.ts:
//
//  - auth-codes/{sha256(code)}               a pending sign-in, 15 minutes
//  - device-tokens/{sha256(token)}           token → user index (bearer lookup)
//  - users/{userId}/devices/{sha256(token)}  the device row the user sees
//
// Neither a code nor a token is ever stored or logged in the clear: only
// their SHA-256. A token is `nst_` + 32 random bytes, so its hash can't be
// reversed; a code is short, so the code row also needs the PKCE verifier
// and dies after five wrong ones.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jsonCollection } from "@/lib/json-collection";

// ─── primitives ──────────────────────────────────────────────────────

export function sha256b64url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ─── auth codes ──────────────────────────────────────────────────────

/** No 0/O/1/I, so a code read off a laptop screen can't be mistyped into
 *  a different valid-looking one. 32 symbols × 8 = 40 bits. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_MAX_WRONG = 5;

export type AuthCodeRow = {
  email: string;
  challenge: string;
  device: string;
  expiresAt: string;
  wrongTries: number;
};

const codes = jsonCollection<AuthCodeRow>("app-auth-codes");
const codePath = (code: string) => `auth-codes/${sha256b64url(code)}`;

function newCode(): string {
  // 256 is a multiple of 32, so a plain modulo over one byte is unbiased.
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

/** Codes are typed by people: accept lowercase and stray spaces/dashes. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

function isCodeShaped(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** base64url of a SHA-256 is 43 chars. */
export function isChallengeShaped(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export async function createAuthCode(
  email: string,
  challenge: string,
  device: string,
): Promise<string> {
  const code = newCode();
  await codes.put(codePath(code), {
    email,
    challenge,
    device,
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    wrongTries: 0,
  });
  return code;
}

// One redemption at a time per code, so two racing requests can't both
// turn the same code into a token. Per process, like the rate limits.
const redeeming = new Set<string>();

export type RedeemResult = { ok: true; email: string; device: string } | { ok: false };

/** Single use: the row is deleted on success, on expiry, and on the fifth
 *  wrong verifier. Every failure looks the same to the caller. */
export async function redeemAuthCode(rawCode: string, verifier: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!isCodeShaped(code)) return { ok: false };
  const path = codePath(code);
  if (redeeming.has(path)) return { ok: false };
  redeeming.add(path);
  try {
    const row = await codes.get(path);
    if (!row) return { ok: false };
    if (Date.parse(row.expiresAt) < Date.now()) {
      await codes.delete(path);
      return { ok: false };
    }
    if (!safeEqual(sha256b64url(verifier), row.challenge)) {
      const wrongTries = row.wrongTries + 1;
      if (wrongTries >= CODE_MAX_WRONG) await codes.delete(path);
      else await codes.put(path, { ...row, wrongTries });
      return { ok: false };
    }
    await codes.delete(path);
    return { ok: true, email: row.email, device: row.device };
  } finally {
    redeeming.delete(path);
  }
}

// ─── device tokens ───────────────────────────────────────────────────

export type DeviceRow = {
  /** Opaque public id — what `/devices/{id}` takes. Not the hash. */
  id: string;
  userId: string;
  tokenHash: string;
  device: string;
  createdAt: string;
  lastUsedAt: string;
};

type TokenIndexRow = { userId: string; deviceId: string };

const devices = jsonCollection<DeviceRow>("app-devices");
const tokenIndex = jsonCollection<TokenIndexRow>("app-device-tokens");
const devicePath = (userId: string, hash: string) => `users/${userId}/devices/${hash}`;
const indexPath = (hash: string) => `device-tokens/${hash}`;

function isDeviceTokenShaped(token: string): boolean {
  return /^nst_[A-Za-z0-9_-]{43}$/.test(token);
}

/** Mint a token for a device. The return value is the only time the token
 *  exists in the clear. */
export async function createDeviceToken(
  userId: string,
  device: string,
): Promise<{ token: string; row: DeviceRow }> {
  const token = `nst_${randomBytes(32).toString("base64url")}`;
  const tokenHash = sha256b64url(token);
  const now = new Date().toISOString();
  const row: DeviceRow = {
    id: `dv_${randomBytes(12).toString("base64url")}`,
    userId,
    tokenHash,
    device,
    createdAt: now,
    lastUsedAt: now,
  };
  await devices.put(devicePath(userId, tokenHash), row);
  await tokenIndex.put(indexPath(tokenHash), { userId, deviceId: row.id });
  return { token, row };
}

// lastUsedAt is for "which phone is this?", not auditing — write it at most
// once a minute per token so reads don't turn into writes.
const LAST_USED_WRITE_MS = 60_000;
const lastUsedWritten = new Map<string, number>();

export type DeviceAuth = { userId: string; deviceId: string };

export async function lookupDeviceToken(token: string): Promise<DeviceAuth | null> {
  if (!isDeviceTokenShaped(token)) return null;
  const tokenHash = sha256b64url(token);
  const index = await tokenIndex.get(indexPath(tokenHash));
  if (!index) return null;

  const now = Date.now();
  const last = lastUsedWritten.get(tokenHash);
  if (last === undefined || now - last > LAST_USED_WRITE_MS) {
    const row = await devices.get(devicePath(index.userId, tokenHash));
    // The index outlived its device row (a half-finished revoke): dead.
    if (!row) return null;
    lastUsedWritten.set(tokenHash, now);
    if (lastUsedWritten.size > 10_000) lastUsedWritten.clear();
    await devices.put(devicePath(index.userId, tokenHash), {
      ...row,
      lastUsedAt: new Date(now).toISOString(),
    });
  }
  return { userId: index.userId, deviceId: index.deviceId };
}

export async function listDevices(userId: string): Promise<DeviceRow[]> {
  const rows = await devices.list(`users/${userId}/devices/`);
  return rows.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

/** Sign a device out. The index goes first: once it's gone the token is
 *  dead, whatever happens to the second delete. */
export async function revokeDevice(userId: string, deviceId: string): Promise<boolean> {
  const row = (await listDevices(userId)).find((d) => d.id === deviceId);
  if (!row) return false;
  await tokenIndex.delete(indexPath(row.tokenHash));
  await devices.delete(devicePath(userId, row.tokenHash));
  lastUsedWritten.delete(row.tokenHash);
  return true;
}
