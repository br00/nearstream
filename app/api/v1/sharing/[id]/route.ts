// DELETE /api/v1/sharing/{id} — stop sharing. Their key answers 410 from
// now on, and the `new` ring makes their server notice in seconds.

import { revalidatePath } from "next/cache";
import { shareStore } from "@/lib/share-store";
import { revoke } from "@/lib/sharing";
import { sharingId } from "@/lib/api-v1-views";
import { noContent, notFound, requireUser, v1 } from "@/lib/api-v1";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = v1(async (request: Request, { params }: Ctx) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const key = (await shareStore.liveKeys(auth.user.id)).find((k) => sharingId(k.token) === id);
  if (!key) return notFound("You don't share with them.");
  await revoke(auth.user, key.token);
  revalidatePath("/reader/friends");
  return noContent();
});
