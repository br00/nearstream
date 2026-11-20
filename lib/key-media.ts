// Media behind a key (PROTOCOL.md §5).
//
// A key feed never hands out raw media keys. If it did, a friend could
// copy `/api/media/{key}` — which is open to anyone holding the key — and
// keep playing a friends-only voice note after you revoke them. Instead
// every media URL in a key feed is
//
//   {site}/feed/{token}/media/{ref}
//
// where `ref` = HMAC(AUTH_SECRET, token + ":" + mediaKey). The ref is
// meaningless without the server secret, differs per key, and the route
// resolves it only while the key is alive — so revoking a key kills every
// media URL that friend was ever given.

import type { User } from "@/schemas/user";
import { mediaKeysFor } from "@/lib/feed-xml";

const KEY_FEED_VISIBILITIES = ["public", "friends"] as const;

function base64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedKey: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is required for key-scoped media");
  }
  cachedKey ??= crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedKey;
}

export async function mediaRef(token: string, mediaKey: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(`key-media:${token}:${mediaKey}`),
  );
  return base64Url(new Uint8Array(sig)).slice(0, 32);
}

export function keyMediaUrl(siteUrl: string, token: string, ref: string): string {
  return `${siteUrl}/feed/${token}/media/${ref}`;
}

/** The media key a ref points at — but only if that media belongs to a post
 *  this key can see. Null otherwise. O(media) per call, which is fine at
 *  circle scale and avoids keeping a ref index in sync. */
export async function resolveMediaRef(
  owner: User,
  token: string,
  ref: string,
): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(ref)) return null;
  const keys = await mediaKeysFor(owner, KEY_FEED_VISIBILITIES);
  for (const key of keys) {
    if ((await mediaRef(token, key)) === ref) return key;
  }
  return null;
}

export { KEY_FEED_VISIBILITIES };
