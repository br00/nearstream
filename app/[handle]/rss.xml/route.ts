// The public feed (PROTOCOL.md §4): `public` posts only. The builder is
// shared with key feeds — see `lib/feed-xml.ts`.

import { notFound } from "next/navigation";
import { userStore } from "@/lib/user-store";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";
import { resolveSitePrivacy } from "@/lib/tenant-visibility";
import { isInternalFeedRequest } from "@/lib/feed-fetcher";
import { buildFeedXml } from "@/lib/feed-xml";

export const dynamic = "force-dynamic";

const INSTANCE_URL =
  process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";

type Props = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  // Only fully-public tenants expose an RSS feed to the outside world.
  // The exception: same-instance fetches (the reader pulling friends'
  // feeds) come with a shared secret header and skip the gate — friends
  // in `friends` mode still need to be readable by other signed-in users
  // on this instance. Private tenants 404 always. (Keys replace this
  // workaround across instances — PROTOCOL.md §5.)
  const privacy = resolveSitePrivacy(user);
  const internal = isInternalFeedRequest(request);
  if (privacy === "private") notFound();
  if (privacy === "friends" && !internal) notFound();

  const siteUrl = tenantAbsoluteBase(handle, INSTANCE_URL);
  const xml = await buildFeedXml({
    user,
    siteUrl,
    selfUrl: `${siteUrl}/rss.xml`,
    // RSS is public-only — friends-only and private entries never appear
    // here. The guid for an entry that flips away from public and back
    // stays the same, so the feed stays clean across edits.
    include: ["public"],
    mediaUrl: async (key) => `${INSTANCE_URL}/api/media/${key}`,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
