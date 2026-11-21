// DELETE /api/v1/lines/{id} — delete one of your Lines. Friends are rung
// so their next fetch drops it (PROTOCOL.md §1: delete means gone).

import { store } from "@/lib/store";
import { afterLineChange } from "@/lib/app-lines";
import { fromId, noContent, notFound, requireUser, v1 } from "@/lib/api-v1";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = v1(async (request: Request, { params }: Ctx) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const raw = fromId("ln", (await params).id);
  const entry = raw ? await store.getById(auth.user.id, raw) : null;
  if (!entry) return notFound("No such Line.");
  await store.delete(auth.user.id, entry.id);
  afterLineChange(auth.user, entry);
  return noContent();
});
