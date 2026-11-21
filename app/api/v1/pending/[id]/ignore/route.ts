// POST /api/v1/pending/{id}/ignore — discard a share. Nothing is kept.

import { revalidatePath } from "next/cache";
import { ignoreShare } from "@/lib/sharing";
import { fromId, noContent, notFound, requireUser, v1 } from "@/lib/api-v1";

type Ctx = { params: Promise<{ id: string }> };

export const POST = v1(async (request: Request, { params }: Ctx) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const raw = fromId("pd", (await params).id);
  if (!raw || !(await ignoreShare(auth.user, raw))) {
    return notFound("That share is no longer waiting.");
  }
  revalidatePath("/reader/friends");
  return noContent();
});
