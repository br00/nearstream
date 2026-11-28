import { store } from "@/lib/store";
import { authorView, isLine, linePostView } from "@/lib/api-v1-views";
import { ok, paginate, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const lines = (await store.list(auth.user.id)).filter(isLine);
  const page = paginate(new URL(request.url), lines, (e) => ({ t: e.publishedAt, id: e.id }));
  if (page instanceof Response) return page;
  const author = authorView(auth.user);
  return ok({ items: page.items.map((e) => linePostView(e, author)), next: page.next });
});
