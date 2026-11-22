// GET /api/v1/friends — who you read, who reads you, and who wants to
// share with you. The same three lists as /reader/friends on the web.

import { shareStore } from "@/lib/share-store";
import { sourceStore } from "@/lib/source-store";
import { friendView, pendingView, sharingView } from "@/lib/api-v1-views";
import { ok, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const [sources, keys, pending] = await Promise.all([
    sourceStore.list(auth.user.id),
    shareStore.liveKeys(auth.user.id),
    shareStore.listPending(auth.user.id),
  ]);
  return ok({
    friends: sources.map(friendView),
    sharing: keys.map(sharingView),
    pending: pending.map(pendingView),
  });
});
