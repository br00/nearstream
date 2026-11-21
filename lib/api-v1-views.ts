// The JSON shapes of the app API (docs/app/API.md). Every v1 response is
// built here, from store rows, so there is one place to check that no
// key URL or key token ever leaves the server: Sources' `feedUrl` (a key
// URL for key friends) and ShareKey `token` are never read below except
// to derive an opaque HMAC id.

import { createHmac } from "node:crypto";
import { addressOf, normalizeAddress, siteUrlFor } from "@/lib/protocol";
import { toId } from "@/lib/api-v1";
import { feedImagesOf, type FeedEntry } from "@/schemas/feed-entry";
import type { Source } from "@/schemas/source";
import type { StreamEntry } from "@/schemas/stream";
import type { User } from "@/schemas/user";
import type { PendingShare, ShareKey } from "@/lib/share-store";
import { visibilityOf } from "@/schemas/visibility";

// ─── me ──────────────────────────────────────────────────────────────

export type MeView = {
  id: string;
  handle: string | null;
  name: string | null;
  address: string | null;
  siteUrl: string | null;
};

export function meView(user: User): MeView {
  if (!user.handle) {
    return { id: toId("u", user.id), handle: null, name: user.displayName || null, address: null, siteUrl: null };
  }
  return {
    id: toId("u", user.id),
    handle: user.handle,
    name: user.displayName || user.handle,
    address: addressOf(user),
    siteUrl: siteUrlFor(user),
  };
}

// ─── lines ───────────────────────────────────────────────────────────

export type LineView = {
  id: string;
  clientId?: string;
  text: string;
  tag: string;
  visibility: string;
  publishedAt: string;
};

export function lineView(entry: StreamEntry): LineView {
  return {
    id: toId("ln", entry.id),
    ...(entry.clientId ? { clientId: entry.clientId } : {}),
    text: entry.text,
    tag: entry.tag,
    visibility: visibilityOf(entry),
    publishedAt: entry.publishedAt,
  };
}

// ─── friends ─────────────────────────────────────────────────────────

export type FriendView = { id: string; name: string; address?: string };

/** A friend's address: the protocol address for key friends, otherwise
 *  derived from their homepage. Never from `feedUrl`, which for a key
 *  friend *is* the key. Absent for a hand-added feed with no homepage. */
function sourceAddress(source: Source): string | undefined {
  if (source.address) return source.address;
  if (source.siteUrl) return normalizeAddress(source.siteUrl) ?? undefined;
  return undefined;
}

export function friendView(source: Source): FriendView {
  const address = sourceAddress(source);
  return { id: toId("fr", source.id), name: source.name, ...(address ? { address } : {}) };
}

/** Opaque, stable id for a key you issued — an HMAC of the token under
 *  the server secret, so the id can't be turned back into the key. */
export function sharingId(token: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  const mac = createHmac("sha256", secret).update(`app-sharing-id:${token}`).digest("base64url");
  return toId("sh", mac.slice(0, 22));
}

export function sharingView(key: ShareKey) {
  return {
    id: sharingId(key.token),
    name: key.friendName,
    address: key.friendAddress,
    since: key.createdAt,
  };
}

export function pendingView(p: PendingShare) {
  return { id: toId("pd", p.id), name: p.fromName, address: p.fromAddress, receivedAt: p.receivedAt };
}

// ─── reader ──────────────────────────────────────────────────────────

function plainText(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > 0 ? text : undefined;
}

export function readerItemView(entry: FeedEntry, source: Source) {
  const images = feedImagesOf(entry).map((img) => ({
    url: img.url,
    ...(img.thumbUrl ? { thumbUrl: img.thumbUrl } : {}),
    ...(img.width ? { width: img.width } : {}),
    ...(img.height ? { height: img.height } : {}),
  }));
  // Essays are long-form HTML; the app shows the excerpt and opens `url`.
  const text = entry.type === "essay" ? undefined : plainText(entry.body);
  return {
    id: toId("fe", entry.id),
    kind: entry.type,
    publishedAt: entry.publishedAt,
    url: entry.url,
    visibility: entry.visibility === "friends" ? "friends" : "public",
    friend: friendView(source),
    ...(entry.title ? { title: entry.title } : {}),
    ...(entry.excerpt ? { excerpt: entry.excerpt } : {}),
    ...(text ? { text } : {}),
    ...(images.length > 0 ? { images } : {}),
    ...(entry.audio
      ? {
          audio: {
            url: entry.audio.url,
            mime: entry.audio.mime,
            ...(entry.audio.durationMs ? { durationMs: entry.audio.durationMs } : {}),
          },
        }
      : {}),
    ...(entry.track
      ? {
          track: {
            title: entry.track.title,
            ...(entry.track.artist ? { artist: entry.track.artist } : {}),
            ...(entry.track.durationMs ? { durationMs: entry.track.durationMs } : {}),
            ...(entry.track.coverUrl ? { coverUrl: entry.track.coverUrl } : {}),
          },
        }
      : {}),
  };
}
