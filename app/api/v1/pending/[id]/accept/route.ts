// POST /api/v1/pending/{id}/accept — accept a share; they become a friend
// in your reader (PROTOCOL.md §8 step 5).

import { revalidatePath } from "next/cache";
import { shareStore } from "@/lib/share-store";
import { sourceStore } from "@/lib/source-store";
import { acceptShare } from "@/lib/sharing";
import { friendView } from "@/lib/api-v1-views";
import { fromId, notFound, ok, requireUser, v1 } from "@/lib/api-v1";

type Ctx = { params: Promise<{ id: string }> };

export const POST = v1(async (request: Request, { params }: Ctx) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const raw = fromId("pd", (await params).id);
  const pending = raw ? await shareStore.getPending(auth.user.id, raw) : null;
  if (!pending || !(await acceptShare(auth.user, pending.id))) {
    return notFound("That share is no longer waiting.");
  }
  revalidatePath("/reader");
  revalidatePath("/reader/friends");
  const source = (await sourceStore.list(auth.user.id)).find(
    (s) => s.address === pending.fromAddress,
  );
  return ok({
    friend: source
      ? friendView(source)
      : { name: pending.fromName, address: pending.fromAddress },
  });
});
