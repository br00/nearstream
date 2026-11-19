// GET {address}/.well-known/nearstream — the discovery document
// (PROTOCOL.md §3). On a custom domain the proxy rewrites
// `/.well-known/nearstream` → `/{handle}/.well-known/nearstream`, so the
// address `alessandroborelli.it` resolves here too.
//
// Answers for anyone whose site isn't `private`: even a `friends`-only
// site has to be findable, or nobody could share with them. The document
// reveals only what a share needs — name, mark, and where to ring.

import { userStore } from "@/lib/user-store";
import { resolveSitePrivacy } from "@/lib/tenant-visibility";
import { normalizeProfileMark } from "@/lib/profile-mark-variants";
import {
  PROTOCOL_VERSION,
  addressOf,
  siteUrlFor,
  type DiscoveryDoc,
} from "@/lib/protocol";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user?.handle || resolveSitePrivacy(user) === "private") {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const site = siteUrlFor(user);
  const doc: DiscoveryDoc = {
    protocol: PROTOCOL_VERSION,
    address: addressOf(user),
    name: user.displayName || user.handle,
    // Index into PROFILE_MARK_VARIANTS, as a string. Readers that don't
    // know the variant draw the default.
    mark: String(normalizeProfileMark(user.profileMark)),
    feed: `${site}/rss.xml`,
    doorbell: `${site}/doorbell`,
    keys: `${site}/feed/`,
  };

  return Response.json(doc, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
