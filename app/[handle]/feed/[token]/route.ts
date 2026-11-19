// GET {site}/feed/{token} — a key feed (PROTOCOL.md §5).
//
// Same RSS format as the public feed, plus `friends` posts. Works in any
// RSS reader — the URL is the credential.
//
//   live key       → 200, the feed
//   revoked key    → 410 Gone (final: the reader drops this friend)
//   unknown token  → 404
//   private site   → 404 (temporary: the owner can switch back)

import { userStore } from "@/lib/user-store";
import { shareStore } from "@/lib/share-store";
import { resolveSitePrivacy } from "@/lib/tenant-visibility";
import { siteUrlFor } from "@/lib/protocol";
import { buildFeedXml } from "@/lib/feed-xml";
import { KEY_FEED_VISIBILITIES, keyMediaUrl, mediaRef } from "@/lib/key-media";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; token: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { handle, token } = await params;
  const owner = await userStore.getByHandle(handle);
  if (!owner) return new Response("not found", { status: 404 });

  const key = await shareStore.getKey(owner.id, token);
  if (!key) return new Response("not found", { status: 404 });
  if (key.revokedAt) return new Response("gone", { status: 410 });
  if (resolveSitePrivacy(owner) === "private") {
    return new Response("not found", { status: 404 });
  }

  const siteUrl = siteUrlFor(owner);
  const xml = await buildFeedXml({
    user: owner,
    siteUrl,
    selfUrl: `${siteUrl}/feed/${token}`,
    include: KEY_FEED_VISIBILITIES,
    mediaUrl: async (mediaKey) =>
      keyMediaUrl(siteUrl, token, await mediaRef(token, mediaKey)),
  });

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // Personal to one friend — never cache in a shared cache.
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
