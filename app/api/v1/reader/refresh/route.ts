// POST /api/v1/reader/refresh — re-pull every friend now (pull-to-refresh).
// Answers straight away; the fetches run after the response. At most one
// refresh per user every 30 seconds — extra pulls are accepted and dropped.

import { after } from "next/server";
import { refreshAllSources } from "@/lib/feed-fetcher";
import { ok, RateLimit, requireUser, v1 } from "@/lib/api-v1";

const perUser = new RateLimit(1, 30_000);

export const POST = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const userId = auth.user.id;
  if (perUser.hit(userId) === 0) {
    after(() =>
      refreshAllSources(userId).then(
        () => undefined,
        (err) => console.error("[api/v1] reader refresh failed:", err instanceof Error ? err.message : err),
      ),
    );
  }
  return ok({}, 202);
});
