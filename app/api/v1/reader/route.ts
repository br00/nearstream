// GET /api/v1/reader — friends' posts, newest first; the same items the
// web /reader shows. Your own Lines are not here (that's /lines).

import { feedEntryStore } from "@/lib/feed-entry-store";
import { sourceStore } from "@/lib/source-store";
import { readerItemView } from "@/lib/api-v1-views";
import { ok, paginate, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const [sources, entries] = await Promise.all([
    sourceStore.list(auth.user.id),
    feedEntryStore.list(auth.user.id),
  ]);
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  // An entry whose friend is gone is an orphan the next refresh would
  // purge anyway; don't show it.
  const visible = entries.filter((e) => sourceById.has(e.sourceId));

  const page = paginate(new URL(request.url), visible, (e) => ({ t: e.publishedAt, id: e.id }));
  if (page instanceof Response) return page;
  return ok({
    items: page.items.map((e) => readerItemView(e, sourceById.get(e.sourceId)!)),
    next: page.next,
  });
});
