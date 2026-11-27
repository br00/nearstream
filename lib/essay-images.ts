// Images inside an essay.
//
// An essay image is an ordinary media blob (`media/{key}` in R2, served at
// `/api/media/{key}`) referenced from the markdown body as
//
//   ![a description](/api/media/{key})
//
// Relative on purpose: `/api/*` is instance-level on every host
// (`proxy.ts` never rewrites it), so the same body renders on
// `nearstream.app/{handle}` and on a custom domain. Feeds can't use a
// relative URL, so `rewriteEssayMedia` makes them absolute there, or
// key-scoped in a key feed (PROTOCOL.md §5).
//
// The essay keeps the keys it *owns* in `Essay.images`, so it can delete
// them when it is deleted or when an edit drops one. Owning is not the same
// as referencing: you can paste the URL of a Picture's image into an essay,
// and deleting that essay must not delete the Picture's image. A key only
// becomes owned when it was uploaded for an essay by you, which the upload
// route proves with a signed token (`signEssayImage`). Without the token, a
// friend could list your image's key as theirs and delete it by deleting
// their own essay.

import { mediaStore } from "@/lib/media-store";

/** `media-store.ts` keys: `{uuid}.{ext}`, images only. */
const IMAGE_KEY = String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)`;
const IMAGE_KEY_RE = new RegExp(`^${IMAGE_KEY}$`);

export function essayImageSrc(key: string): string {
  return `/api/media/${key}`;
}

/** Every image key the markdown body points at through `/api/media/`. */
export function referencedImageKeys(body: string): Set<string> {
  const keys = new Set<string>();
  for (const m of body.matchAll(new RegExp(`/api/media/(${IMAGE_KEY})`, "g"))) {
    keys.add(m[1]);
  }
  return keys;
}

// ── Upload tokens ──────────────────────────────────────────────────────────

let cachedKey: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is required for essay images");
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

async function sign(userId: string, key: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(`essay-image:${userId}:${key}`),
  );
  let hex = "";
  for (const b of new Uint8Array(sig)) hex += b.toString(16).padStart(2, "0");
  return hex.slice(0, 32);
}

/** `{key}:{sig}` — handed to the editor at upload, sent back with the form. */
export async function signEssayImage(userId: string, key: string): Promise<string> {
  return `${key}:${await sign(userId, key)}`;
}

/** The keys among `tokens` that this user really uploaded for an essay.
 *  Anything malformed or forged is dropped silently. */
export async function verifyEssayImageTokens(
  userId: string,
  tokens: unknown[],
): Promise<string[]> {
  const out: string[] = [];
  for (const t of tokens) {
    if (typeof t !== "string") continue;
    const i = t.lastIndexOf(":");
    if (i === -1) continue;
    const key = t.slice(0, i);
    if (!IMAGE_KEY_RE.test(key)) continue;
    if (t.slice(i + 1) === (await sign(userId, key))) out.push(key);
  }
  return out;
}

// ── Ownership across edits ─────────────────────────────────────────────────

/** Which images an essay owns after a save, and which it gave up.
 *  Owned = what it owned before plus what was just uploaded, kept only if
 *  the body still uses it. An image uploaded and then removed before saving
 *  is dropped straight away. */
export function settleEssayImages(
  previous: readonly string[],
  uploaded: readonly string[],
  body: string,
): { keep: string[]; drop: string[] } {
  const used = referencedImageKeys(body);
  const candidates = [...new Set([...previous, ...uploaded])];
  return {
    keep: candidates.filter((k) => used.has(k)),
    drop: candidates.filter((k) => !used.has(k)),
  };
}

/** Best-effort: a blob that fails to delete is an orphan in R2, not an
 *  error the person needs to see. */
export async function deleteEssayImages(keys: readonly string[]): Promise<void> {
  if (!mediaStore || keys.length === 0) return;
  const m = mediaStore;
  await Promise.all(
    keys.map(async (key) => {
      try {
        await m.deleteImage(key);
      } catch (err) {
        console.warn(`[essay-images] failed to delete media/${key}`, err);
      }
    }),
  );
}

// ── Feeds ──────────────────────────────────────────────────────────────────

/** Rewrite `src="/api/media/{key}"` in rendered essay HTML for a feed.
 *  Keys in `allowed` (the feed's `mediaKeysFor` set: an essay's own images,
 *  or a Picture's image that the same feed already carries) go through
 *  `mediaUrl` — absolute in the public feed, key-scoped in a key feed, so
 *  revoking the key kills them. Anything else can't be served through a
 *  key (the media route would 404 it), so it is made absolute with
 *  `instanceUrl`: the author pasted that URL into a post they chose to
 *  share. */
export async function rewriteEssayMedia(
  html: string,
  allowed: ReadonlySet<string>,
  mediaUrl: (key: string) => Promise<string>,
  instanceUrl: string,
): Promise<string> {
  const re = new RegExp(`src="/api/media/(${IMAGE_KEY})"`, "g");
  const urls = new Map<string, string>();
  for (const m of html.matchAll(re)) {
    const key = m[1];
    if (urls.has(key)) continue;
    urls.set(
      key,
      allowed.has(key) ? await mediaUrl(key) : `${instanceUrl}/api/media/${key}`,
    );
  }
  return html.replace(re, (_, key: string) => `src="${urls.get(key)}"`);
}
